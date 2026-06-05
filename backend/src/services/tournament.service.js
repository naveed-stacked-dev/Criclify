const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const ApiError = require('../utils/ApiError');

/**
 * Create a new tournament.
 */
const createTournament = async (data) => {
  const tournament = await Tournament.create(data);
  return tournament;
};

/**
 * Get tournaments in a club with pagination.
 */
const getTournamentsByClub = async (clubId, { skip, limit }) => {
  const [tournaments, total] = await Promise.all([
    Tournament.find({ clubId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('teams', 'name logo'),
    Tournament.countDocuments({ clubId }),
  ]);
  return { tournaments, total };
};

/**
 * Get all tournaments (for Super Admin).
 */
const getAllTournaments = async ({ skip, limit }) => {
  const [tournaments, total] = await Promise.all([
    Tournament.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('teams', 'name logo')
      .populate('clubId', 'name'),
    Tournament.countDocuments(),
  ]);
  return { tournaments, total };
};

/**
 * Get tournament by ID.
 */
const getTournamentById = async (id) => {
  const tournament = await Tournament.findById(id)
    .populate('teams', 'name logo')
    .populate({
      path: 'matches',
      populate: [
        { path: 'teamA', select: 'name logo' },
        { path: 'teamB', select: 'name logo' },
      ],
    });
  if (!tournament) throw ApiError.notFound('Tournament not found');
  return tournament;
};

/**
 * Generate round-robin fixtures for a club-format tournament.
 * Uses the standard round-robin algorithm: fix one team, rotate the rest.
 * Only creates team pairings with status "unscheduled".
 */
/**
 * Round-robin algorithm for a set of teams.
 * Returns array of { teamA, teamB } pairs.
 */
function roundRobinPairs(teams) {
  const list = [...teams];
  if (list.length % 2 !== 0) list.push(null); // bye slot
  const total = list.length;
  const rounds = total - 1;
  const perRound = total / 2;
  const pairs = [];
  const indices = list.map((_, i) => i);

  for (let r = 0; r < rounds; r++) {
    for (let m = 0; m < perRound; m++) {
      const a = indices[m];
      const b = indices[total - 1 - m];
      if (list[a] && list[b]) pairs.push({ teamA: list[a], teamB: list[b], round: r + 1 });
    }
    const last = indices.pop();
    indices.splice(1, 0, last);
  }
  return pairs;
}

const generateLeagueFixtures = async (tournamentId) => {
  const tournament = await Tournament.findById(tournamentId).populate('teams');
  if (!tournament) throw ApiError.notFound('Tournament not found');
  if (tournament.matches.length > 0) {
    throw ApiError.conflict('Fixtures have already been generated');
  }

  const allTeams = tournament.teams;
  if (allTeams.length < 2) throw ApiError.badRequest('Need at least 2 teams to generate fixtures');

  const fixtures = [];
  let matchNumber = 1;

  // ── Group-stage fixtures ──────────────────────────────────────
  const activeGroups = (tournament.groups || []).filter(g => g.teams && g.teams.length >= 2);
  const hasGroups = activeGroups.length >= 2;

  if (hasGroups) {
    for (const group of activeGroups) {
      const groupTeamIds = group.teams.map(t => t.toString());
      const groupTeams = allTeams.filter(t => groupTeamIds.includes(t._id.toString()));
      const pairs = roundRobinPairs(groupTeams);
      let groupMatchNum = 1;

      for (const pair of pairs) {
        fixtures.push({
          teamA: pair.teamA._id,
          teamB: pair.teamB._id,
          tournamentId: tournament._id,
          clubId: tournament.clubId,
          status: 'unscheduled',
          matchNumber: matchNumber++,
          round: pair.round,
          matchGroup: group.name,
          matchLabel: `Grp ${group.name} - M${groupMatchNum++}`,
          tournamentMeta: { isKnockout: false, roundNumber: pair.round },
          oversPerInning: tournament.settings?.oversPerInning || 20,
        });
      }
    }
  } else {
    // ── Flat round-robin (no groups) ──────────────────────────
    const pairs = roundRobinPairs(allTeams);
    for (const pair of pairs) {
      fixtures.push({
        teamA: pair.teamA._id,
        teamB: pair.teamB._id,
        tournamentId: tournament._id,
        clubId: tournament.clubId,
        status: 'unscheduled',
        matchNumber: matchNumber++,
        round: pair.round,
        tournamentMeta: { isKnockout: false, roundNumber: pair.round },
        oversPerInning: tournament.settings?.oversPerInning || 20,
      });
    }
  }

  const createdMatches = await Match.insertMany(fixtures);
  const matchIds = createdMatches.map((m) => m._id);

  const pointsTable = allTeams.map((team) => ({
    teamId: team._id,
    played: 0, won: 0, lost: 0, tied: 0, noResult: 0,
    points: 0, nrr: 0, runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0,
  }));

  tournament.matches = matchIds;
  tournament.pointsTable = pointsTable;
  tournament.status = 'ongoing';
  await tournament.save();

  return { tournament, matches: createdMatches, hasGroups, groupCount: hasGroups ? activeGroups.length : 0 };
};

// ─── KNOCKOUT BRACKET GENERATION ────────────────────────────────────────────

/**
 * Get human-readable round label.
 */
function getRoundLabel(roundNumber, totalRounds) {
  const roundFromFinal = totalRounds - roundNumber + 1;
  switch (roundFromFinal) {
    case 1: return 'Final';
    case 2: return 'SF';
    case 3: return 'QF';
    default: return `R${roundNumber}`;
  }
}

/**
 * Generate a complete knockout bracket using a strict binary tree approach.
 * 
 * The algorithm:
 * 1. Calculate the nearest power-of-2 >= N (the bracket size)
 * 2. Determine total rounds = log2(bracketSize)
 * 3. Create matches from the Final backwards to Round 1
 * 4. Wire each match's nextMatchId + nextMatchSlot to its parent
 * 5. Seed teams into Round 1 — empty slots are BYEs
 * 6. Process BYEs: auto-advance teams through BYE matches
 */
const generateKnockoutFixtures = async (tournamentId) => {
  const tournament = await Tournament.findById(tournamentId).populate('teams');
  if (!tournament) throw ApiError.notFound('Tournament not found');
  if (tournament.matches.length > 0) {
    throw ApiError.conflict('Fixtures have already been generated');
  }

  const teams = tournament.teams;
  const N = teams.length;
  if (N < 2) {
    throw ApiError.badRequest('Need at least 2 teams for knockout');
  }

  // Calculate bracket size (nearest power of 2 >= N)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(N)));
  const totalRounds = Math.ceil(Math.log2(bracketSize));
  const totalMatches = bracketSize - 1;

  // We build the bracket structure from Final down to Round 1
  // matchesByRound[round] = array of match documents (round is 1-indexed)
  const allMatchDocs = [];

  // Create all match placeholders first
  for (let round = totalRounds; round >= 1; round--) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    const roundLabel = getRoundLabel(round, totalRounds);

    for (let order = 0; order < matchesInRound; order++) {
      allMatchDocs.push({
        tournamentId: tournament._id,
        clubId: tournament.clubId,
        status: 'unscheduled',
        round: round,
        matchOrder: order,
        matchLabel: `${roundLabel}${matchesInRound > 1 ? order + 1 : ''}`,
        isFinal: round === totalRounds,
        isBye: false,
        tournamentMeta: {
          isKnockout: true,
          roundNumber: round,
          nextMatchId: null,
          nextMatchSlot: null,
        },
        oversPerInning: tournament.settings?.oversPerInning || 20,
      });
    }
  }

  // Insert all matches
  const createdMatches = await Match.insertMany(allMatchDocs);

  // Build a lookup: matchMap[round][matchOrder] = match document
  const matchMap = {};
  for (const m of createdMatches) {
    if (!matchMap[m.round]) matchMap[m.round] = {};
    matchMap[m.round][m.matchOrder] = m;
  }

  // Wire nextMatchId links: each match in round R at position P
  // feeds into round R+1 at position floor(P/2)
  // Slot A if P is even, Slot B if P is odd
  const bulkOps = [];
  let matchCounter = 1;

  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    for (let order = 0; order < matchesInRound; order++) {
      const match = matchMap[round][order];

      // Assign matchNumber
      bulkOps.push({
        updateOne: {
          filter: { _id: match._id },
          update: { matchNumber: matchCounter++ },
        },
      });

      // Wire to next round (skip for the Final)
      if (round < totalRounds) {
        const nextRound = round + 1;
        const nextOrder = Math.floor(order / 2);
        const nextSlot = order % 2 === 0 ? 'A' : 'B';
        const nextMatch = matchMap[nextRound][nextOrder];

        bulkOps.push({
          updateOne: {
            filter: { _id: match._id },
            update: {
              'tournamentMeta.nextMatchId': nextMatch._id,
              'tournamentMeta.nextMatchSlot': nextSlot,
            },
          },
        });
      }
    }
  }

  // Seed teams into Round 1
  // Standard seeding: position teams so that seed 1 vs last, etc.
  const seededTeams = [...teams];
  const round1Size = bracketSize / 2;

  for (let order = 0; order < round1Size; order++) {
    const teamAIndex = order;
    const teamBIndex = bracketSize - 1 - order;

    const teamA = teamAIndex < N ? seededTeams[teamAIndex] : null;
    const teamB = teamBIndex < N ? seededTeams[teamBIndex] : null;
    const match = matchMap[1][order];

    const updateData = {};
    if (teamA) updateData.teamA = teamA._id;
    if (teamB) updateData.teamB = teamB._id;

    // Mark as BYE if one team is missing
    if ((teamA && !teamB) || (!teamA && teamB)) {
      updateData.isBye = true;
      updateData.status = 'completed';
      const advancingTeam = teamA || teamB;
      updateData['result.winner'] = advancingTeam._id;
      updateData.matchLabel = `${match.matchLabel} (BYE)`;
    }

    if (Object.keys(updateData).length > 0) {
      bulkOps.push({
        updateOne: {
          filter: { _id: match._id },
          update: updateData,
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    await Match.bulkWrite(bulkOps);
  }

  // Process BYEs: propagate winners through nextMatchId
  await propagateByeWinners(matchMap, totalRounds);

  // Refresh all matches
  const finalMatches = await Match.find({ tournamentId: tournament._id })
    .sort({ round: 1, matchOrder: 1 })
    .populate('teamA', 'name logo')
    .populate('teamB', 'name logo');

  const matchIds = finalMatches.map((m) => m._id);
  tournament.matches = matchIds;
  tournament.status = 'ongoing';
  await tournament.save();

  return { tournament, matches: finalMatches };
};

/**
 * After seeding + marking BYEs, propagate BYE winners into their next matches.
 */
async function propagateByeWinners(matchMap, totalRounds) {
  // Process round by round, starting from round 1
  for (let round = 1; round < totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    const bulkOps = [];

    for (let order = 0; order < matchesInRound; order++) {
      // Re-fetch to get updated data
      const match = await Match.findById(matchMap[round][order]._id);
      if (!match) continue;

      if (match.isBye && match.result?.winner && match.tournamentMeta?.nextMatchId) {
        const nextMatch = await Match.findById(match.tournamentMeta.nextMatchId);
        if (!nextMatch) continue;

        const slot = match.tournamentMeta.nextMatchSlot;
        const update = {};

        if (slot === 'A') {
          update.teamA = match.result.winner;
        } else {
          update.teamB = match.result.winner;
        }

        await Match.findByIdAndUpdate(nextMatch._id, update);

        // Check if the next match now has only one team (another cascading BYE)
        const updatedNext = await Match.findById(nextMatch._id);
        if (updatedNext) {
          const hasA = !!updatedNext.teamA;
          const hasB = !!updatedNext.teamB;

          // Check if the other feeder match is also a BYE
          // If so, both teams are now filled and it's a real match
          // If the other feeder hasn't been processed yet, wait
        }
      }
    }
  }
}

// ─── RESULT SUBMISSION WITH WINNER PROPAGATION ──────────────────────────────

/**
 * Submit a match result and propagate the winner to the next match in the bracket.
 * Handles cascade: if editing a result, clears downstream matches first.
 */
const submitMatchResult = async (matchId, { winnerId }) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');

  if (match.isBye) {
    throw ApiError.badRequest('Cannot manually set result for a BYE match');
  }

  // Validate winner is one of the teams
  const teamAId = match.teamA?.toString();
  const teamBId = match.teamB?.toString();
  if (winnerId !== teamAId && winnerId !== teamBId) {
    throw ApiError.badRequest('Winner must be one of the teams in this match');
  }

  const loserId = winnerId === teamAId ? teamBId : teamAId;

  // If match already had a different winner, cascade-clear downstream
  const previousWinner = match.result?.winner?.toString();
  if (previousWinner && previousWinner !== winnerId) {
    await clearDownstreamMatches(match);
  }

  // Update the current match
  match.result = { winner: winnerId };
  match.status = 'completed';
  await match.save();

  // Propagate winner to next match
  if (match.tournamentMeta?.nextMatchId) {
    const nextMatch = await Match.findById(match.tournamentMeta.nextMatchId);
    if (nextMatch) {
      const slot = match.tournamentMeta.nextMatchSlot;
      if (slot === 'A') {
        nextMatch.teamA = winnerId;
      } else {
        nextMatch.teamB = winnerId;
      }
      await nextMatch.save();
    }
  }

  return await Match.findById(matchId)
    .populate('teamA', 'name logo')
    .populate('teamB', 'name logo')
    .populate('result.winner', 'name logo');
};

/**
 * Recursively clear downstream match results when a result is edited.
 * Prevents inconsistent bracket state.
 */
async function clearDownstreamMatches(match) {
  if (!match.tournamentMeta?.nextMatchId) return;

  const nextMatch = await Match.findById(match.tournamentMeta.nextMatchId);
  if (!nextMatch) return;

  // Check if the next match is already completed — block if so
  if (nextMatch.status === 'completed' && !nextMatch.isBye) {
    throw ApiError.badRequest(
      'Cannot change result: the next match in the bracket has already been completed. You must revert that match first.'
    );
  }

  // Clear the team slot that this match feeds into
  const slot = match.tournamentMeta.nextMatchSlot;
  if (slot === 'A') {
    nextMatch.teamA = null;
  } else {
    nextMatch.teamB = null;
  }

  // Reset the downstream match
  nextMatch.result = {};
  nextMatch.status = 'unscheduled';
  await nextMatch.save();

  // Continue clearing further downstream
  await clearDownstreamMatches(nextMatch);
}

// ─── GET BRACKET DATA ───────────────────────────────────────────────────────

/**
 * Get the full bracket tree for a knockout tournament.
 * Returns matches organized by rounds with team data populated.
 */
const getBracket = async (tournamentId) => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw ApiError.notFound('Tournament not found');

  const matches = await Match.find({
    tournamentId,
    'tournamentMeta.isKnockout': true,
  })
    .sort({ round: 1, matchOrder: 1 })
    .populate('teamA', 'name logo shortName color')
    .populate('teamB', 'name logo shortName color')
    .populate('result.winner', 'name logo shortName color')
    .populate('tournamentMeta.nextMatchId', 'round matchOrder matchLabel');

  // Organize by round
  const rounds = {};
  let maxRound = 0;
  for (const match of matches) {
    const r = match.round;
    if (!rounds[r]) rounds[r] = [];
    rounds[r].push(match);
    if (r > maxRound) maxRound = r;
  }

  return {
    tournament: {
      _id: tournament._id,
      name: tournament.name,
      type: tournament.type,
      status: tournament.status,
    },
    totalRounds: maxRound,
    rounds,
    matches,
  };
};

/**
 * Generate fixtures based on tournament type.
 */
const generateFixtures = async (tournamentId) => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw ApiError.notFound('Tournament not found');

  if (tournament.type === 'league') {
    return generateLeagueFixtures(tournamentId);
  } else if (tournament.type === 'knockout') {
    return generateKnockoutFixtures(tournamentId);
  } else {
    throw ApiError.badRequest('Invalid tournament type');
  }
};

/**
 * Get points table for a tournament.
 */
const getPointsTable = async (tournamentId) => {
  const tournament = await Tournament.findById(tournamentId).populate(
    'pointsTable.teamId',
    'name logo color'
  );
  if (!tournament) throw ApiError.notFound('Tournament not found');

  const sortFn = (a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    return b.nrr - a.nrr;
  };

  const activeGroups = (tournament.groups || []).filter(g => g.teams && g.teams.length >= 2);
  const hasGroups = activeGroups.length >= 2;

  if (hasGroups) {
    const groupedTable = activeGroups.map(group => {
      const groupTeamIds = new Set(group.teams.map(t => t.toString()));
      const groupStandings = tournament.pointsTable
        .filter(entry => {
          const tid = entry.teamId?._id?.toString() || entry.teamId?.toString();
          return groupTeamIds.has(tid);
        })
        .sort(sortFn);
      return { groupName: group.name, teams: groupStandings };
    });

    // Teams not in any group go to "Other"
    const assignedIds = new Set(activeGroups.flatMap(g => g.teams.map(t => t.toString())));
    const unassigned = tournament.pointsTable.filter(entry => {
      const tid = entry.teamId?._id?.toString() || entry.teamId?.toString();
      return !assignedIds.has(tid);
    }).sort(sortFn);
    if (unassigned.length > 0) groupedTable.push({ groupName: 'Other', teams: unassigned });

    return { hasGroups: true, groups: groupedTable, all: [...tournament.pointsTable].sort(sortFn) };
  }

  return { hasGroups: false, groups: [], all: [...tournament.pointsTable].sort(sortFn) };
};

/**
 * Update points table after a match is completed.
 */
const updatePointsTable = async (tournamentId, matchResult) => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament || tournament.type !== 'league') return;

  const { teamA, teamB, winner, teamAOvers, teamBOvers, teamARuns, teamBRuns } =
    matchResult;

  const updateTeamEntry = (entry, isWinner, isTied, runsFor, oversFor, runsAgainst, oversAgainst) => {
    entry.played += 1;
    if (isTied) {
      entry.tied += 1;
      entry.points += 1;
    } else if (isWinner) {
      entry.won += 1;
      entry.points += 2;
    } else {
      entry.lost += 1;
    }
    entry.runsScored += runsFor;
    entry.oversFaced += oversFor;
    entry.runsConceded += runsAgainst;
    entry.oversBowled += oversAgainst;

    // Calculate NRR
    if (entry.oversFaced > 0 && entry.oversBowled > 0) {
      entry.nrr = parseFloat(
        (entry.runsScored / entry.oversFaced - entry.runsConceded / entry.oversBowled).toFixed(3)
      );
    }
  };

  const isTied = !winner;
  const teamAEntry = tournament.pointsTable.find(
    (e) => e.teamId.toString() === teamA.toString()
  );
  const teamBEntry = tournament.pointsTable.find(
    (e) => e.teamId.toString() === teamB.toString()
  );

  if (teamAEntry) {
    updateTeamEntry(
      teamAEntry,
      winner && winner.toString() === teamA.toString(),
      isTied,
      teamARuns,
      teamAOvers,
      teamBRuns,
      teamBOvers
    );
  }

  if (teamBEntry) {
    updateTeamEntry(
      teamBEntry,
      winner && winner.toString() === teamB.toString(),
      isTied,
      teamBRuns,
      teamBOvers,
      teamARuns,
      teamAOvers
    );
  }

  await tournament.save();
};

/**
 * Update a tournament.
 */
const updateTournament = async (id, data) => {
  const tournament = await Tournament.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!tournament) throw ApiError.notFound('Tournament not found');
  return tournament;
};

// ─── BRACKET GRAPH (VISUAL BUILDER) ────────────────────────────────────────

/**
 * Get the bracket graph for the visual builder.
 * Returns all matches with positions and edge data.
 */
const getBracketGraph = async (tournamentId) => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw ApiError.notFound('Tournament not found');

  const matches = await Match.find({ tournamentId })
    .sort({ createdAt: 1 })
    .populate('teamA', 'name logo shortName color')
    .populate('teamB', 'name logo shortName color')
    .populate('result.winner', 'name logo shortName color');

  // Build nodes (one per match)
  const nodes = matches.map((m) => ({
    id: m._id.toString(),
    match: m,
    position: {
      x: m.tournamentMeta?.positionX ?? null,
      y: m.tournamentMeta?.positionY ?? null,
    },
  }));

  // Build edges (connections between matches)
  const edges = [];
  for (const m of matches) {
    if (m.tournamentMeta?.nextMatchId) {
      edges.push({
        source: m._id.toString(),
        target: m.tournamentMeta.nextMatchId.toString(),
        slot: m.tournamentMeta.nextMatchSlot || 'A',
      });
    }
  }

  return { tournament: { _id: tournament._id, name: tournament.name, type: tournament.type }, nodes, edges };
};

/**
 * Save the bracket graph from the visual builder.
 * Validates structure, calculates rounds, and persists connections + positions.
 *
 * @param {string} tournamentId
 * @param {Object} data
 * @param {Array} data.edges - [{ source, target, slot }]
 * @param {Array} data.positions - [{ id, x, y }]
 */
const saveBracketGraph = async (tournamentId, { edges = [], positions = [] }) => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw ApiError.notFound('Tournament not found');

  const matches = await Match.find({ tournamentId });
  const matchIds = new Set(matches.map((m) => m._id.toString()));

  // Validate all edge references exist in this tournament
  for (const edge of edges) {
    if (!matchIds.has(edge.source)) throw ApiError.badRequest(`Invalid source match: ${edge.source}`);
    if (!matchIds.has(edge.target)) throw ApiError.badRequest(`Invalid target match: ${edge.target}`);
    if (edge.source === edge.target) throw ApiError.badRequest('A match cannot connect to itself');
  }

  // Validate max 2 inputs per match
  const inputCounts = {};
  for (const edge of edges) {
    inputCounts[edge.target] = (inputCounts[edge.target] || 0) + 1;
    if (inputCounts[edge.target] > 2) {
      throw ApiError.badRequest(`Match cannot have more than 2 feeder matches`);
    }
  }

  // Validate no cycles using topological sort (Kahn's algorithm)
  const adjacency = {};    // source -> [targets]
  const inDegree = {};
  for (const id of matchIds) {
    adjacency[id] = [];
    inDegree[id] = 0;
  }
  for (const edge of edges) {
    adjacency[edge.source].push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  }

  const queue = [];
  for (const id of matchIds) {
    if ((inDegree[id] || 0) === 0) queue.push(id);
  }

  let visited = 0;
  const topoOrder = [];
  while (queue.length > 0) {
    const node = queue.shift();
    topoOrder.push(node);
    visited++;
    for (const neighbor of adjacency[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  if (visited !== matchIds.size) {
    throw ApiError.badRequest('Circular dependency detected in bracket structure');
  }

  // Calculate round numbers via BFS from leaf nodes (no incoming edges)
  // Leaf nodes = Round 1, their targets = Round 2, etc.
  const roundMap = {};
  const reverseAdj = {}; // target -> [sources]
  for (const id of matchIds) reverseAdj[id] = [];
  for (const edge of edges) {
    reverseAdj[edge.target].push(edge.source);
  }

  // BFS from leaves
  const leafNodes = [...matchIds].filter((id) => reverseAdj[id].length === 0);
  // Matches not in any edge at all get round 1
  for (const id of matchIds) {
    if (!edges.some((e) => e.source === id || e.target === id)) {
      roundMap[id] = 1;
    }
  }
  for (const leaf of leafNodes) {
    roundMap[leaf] = 1;
  }

  // Forward pass: each node's round = max(round of all sources) + 1
  for (const nodeId of topoOrder) {
    const sources = reverseAdj[nodeId];
    if (sources.length > 0) {
      const maxSourceRound = Math.max(...sources.map((s) => roundMap[s] || 1));
      roundMap[nodeId] = maxSourceRound + 1;
    } else if (!roundMap[nodeId]) {
      roundMap[nodeId] = 1;
    }
  }

  // Find the final match (node with no outgoing edges in the edge list)
  const hasOutgoing = new Set(edges.map((e) => e.source));
  const finalMatches = [...matchIds].filter((id) => !hasOutgoing.has(id) && edges.some((e) => e.target === id));

  // Build edge lookup: source -> { target, slot }
  const edgeMap = {};
  for (const edge of edges) {
    edgeMap[edge.source] = { target: edge.target, slot: edge.slot || 'A' };
  }

  // Build position lookup
  const posMap = {};
  for (const pos of positions) {
    posMap[pos.id] = { x: pos.x, y: pos.y };
  }

  // Assign slots: for each target, the first source = A, second = B
  const targetSlots = {};
  for (const edge of edges) {
    if (!targetSlots[edge.target]) targetSlots[edge.target] = [];
    targetSlots[edge.target].push(edge.source);
  }

  // Bulk update all matches
  const bulkOps = [];
  for (const id of matchIds) {
    const edgeOut = edgeMap[id];
    const pos = posMap[id];
    const round = roundMap[id] || 1;
    const isFinal = finalMatches.includes(id);
    const isInGraph = edges.some((e) => e.source === id || e.target === id);

    // Determine slot for this source in its target
    let slot = null;
    if (edgeOut) {
      const siblings = targetSlots[edgeOut.target] || [];
      const idx = siblings.indexOf(id);
      slot = idx === 0 ? 'A' : 'B';
    }

    const update = {
      'tournamentMeta.isKnockout': isInGraph ? true : false,
      'tournamentMeta.roundNumber': isInGraph ? round : null,
      'tournamentMeta.nextMatchId': edgeOut ? edgeOut.target : null,
      'tournamentMeta.nextMatchSlot': slot,
      'tournamentMeta.positionX': pos ? pos.x : null,
      'tournamentMeta.positionY': pos ? pos.y : null,
      round: isInGraph ? round : null,
      isFinal: isFinal,
    };

    // Auto-assign matchOrder within the round
    bulkOps.push({
      updateOne: { 
        filter: { _id: id }, 
        update: { $set: update } 
      },
    });
  }

  if (bulkOps.length > 0) {
    await Match.bulkWrite(bulkOps);
  }

  // Now assign matchOrder per round
  const roundGroups = {};
  for (const id of matchIds) {
    const r = roundMap[id] || 1;
    if (!roundGroups[r]) roundGroups[r] = [];
    roundGroups[r].push(id);
  }
  const orderOps = [];
  for (const [, ids] of Object.entries(roundGroups)) {
    ids.forEach((id, idx) => {
      orderOps.push({
        updateOne: { 
          filter: { _id: id }, 
          update: { $set: { matchOrder: idx } } 
        },
      });
    });
  }
  if (orderOps.length > 0) await Match.bulkWrite(orderOps);

  // Update tournament matches array
  tournament.matches = matches.map((m) => m._id);
  await tournament.save();

  return getBracketGraph(tournamentId);
};

module.exports = {
  createTournament,
  getAllTournaments,
  getTournamentsByClub,
  getTournamentById,
  generateFixtures,
  getPointsTable,
  updatePointsTable,
  updateTournament,
  submitMatchResult,
  getBracket,
  getBracketGraph,
  saveBracketGraph,
};

