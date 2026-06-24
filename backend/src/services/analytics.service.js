const MatchEvent = require('../models/MatchEvent');
const Match = require('../models/Match');
const PlayerStatsCache = require('../models/PlayerStatsCache');
const Team = require('../models/Team');
const ApiError = require('../utils/ApiError');

/**
 * ──────────────────────────────────────────
 *  PLAYER ANALYTICS
 * ──────────────────────────────────────────
 */
const getPlayerAnalytics = async (playerId) => {
  const stats = await PlayerStatsCache.findOne({ playerId })
    .populate('playerId', 'name role teamId avatar');
  if (!stats) throw ApiError.notFound('Player stats not found');

  return {
    player: stats.playerId,
    batting: {
      totalRuns: stats.totalRuns,
      totalInnings: stats.totalInnings,
      notOuts: stats.notOuts,
      highestScore: stats.highestScore,
      battingAverage: stats.battingAverage,
      strikeRate: stats.strikeRate,
      fours: stats.fours,
      sixes: stats.sixes,
      fifties: stats.fifties,
      hundreds: stats.hundreds,
      boundaryPercentage: stats.boundaryPercentage,
      dotBallPercentage: stats.dotBallPercentage,
    },
    bowling: {
      totalWickets: stats.totalWickets,
      totalOversBowled: stats.totalOversBowled,
      totalRunsConceded: stats.totalRunsConceded,
      economy: stats.economy,
      bowlingAverage: stats.bowlingAverage,
      bowlingStrikeRate: stats.bowlingStrikeRate,
      bestBowling: stats.bestBowling,
      dotBallsBowled: stats.dotBallsBowled,
      maidens: stats.maidens,
    },
    fielding: {
      catches: stats.catches,
      stumpings: stats.stumpings,
      runOuts: stats.runOuts,
    },
    recentForm: {
      lastFiveScores: stats.recentScores || [],
      lastFiveWickets: stats.recentWickets || [],
    },
    totalMatches: stats.totalMatches,
  };
};

/**
 * ──────────────────────────────────────────
 *  MATCH ANALYTICS (charts / graphs)
 * ──────────────────────────────────────────
 */
const getMatchAnalytics = async (matchId) => {
  const match = await Match.findById(matchId)
    .populate('teamA', 'name')
    .populate('teamB', 'name');
  if (!match) throw ApiError.notFound('Match not found');

  const events = await MatchEvent.find({ matchId }).sort({ timestamp: 1 });
  if (events.length === 0) {
    return { runRateGraph: [], manhattanChart: [], wormChart: [] };
  }

  // ── Run Rate Graph (runs per over for each inning) ──
  const runRateGraph = { first: [], second: [] };
  const manhattanChart = { first: [], second: [] };
  const wormChart = { first: [], second: [] };

  const inningEvents = { 1: [], 2: [] };
  for (const event of events) {
    inningEvents[event.inning].push(event);
  }

  for (const inning of [1, 2]) {
    const evts = inningEvents[inning];
    if (evts.length === 0) continue;

    const overRuns = {}; // { overNumber: totalRuns }
    let cumulativeRuns = 0;
    let cumulativeBalls = 0;

    for (const event of evts) {
      const overNum = event.over;
      const totalRuns = event.runs + (event.extras?.runs || 0);

      if (!overRuns[overNum]) overRuns[overNum] = 0;
      overRuns[overNum] += totalRuns;
      cumulativeRuns += totalRuns;
      if (event.isLegalDelivery) cumulativeBalls += 1;

      // Worm chart: cumulative runs after each legal ball
      if (event.isLegalDelivery) {
        const inningKey = inning === 1 ? 'first' : 'second';
        wormChart[inningKey].push({
          ball: cumulativeBalls,
          over: Math.floor((cumulativeBalls - 1) / 6),
          ballInOver: ((cumulativeBalls - 1) % 6) + 1,
          totalRuns: cumulativeRuns,
        });
      }
    }

    const inningKey = inning === 1 ? 'first' : 'second';

    // Manhattan chart: runs per over
    const sortedOvers = Object.keys(overRuns)
      .map(Number)
      .sort((a, b) => a - b);
    for (const overNum of sortedOvers) {
      manhattanChart[inningKey].push({
        over: overNum + 1, // 1-indexed for display
        runs: overRuns[overNum],
      });
    }

    // Run rate graph: cumulative run rate after each over
    let cumRuns = 0;
    for (const overNum of sortedOvers) {
      cumRuns += overRuns[overNum];
      const oversCompleted = overNum + 1;
      runRateGraph[inningKey].push({
        over: oversCompleted,
        runRate: parseFloat((cumRuns / oversCompleted).toFixed(2)),
      });
    }
  }

  return {
    match: {
      teamA: match.teamA,
      teamB: match.teamB,
      status: match.status,
    },
    runRateGraph,
    manhattanChart,
    wormChart,
  };
};

/**
 * ──────────────────────────────────────────
 *  TEAM ANALYTICS
 * ──────────────────────────────────────────
 */
const getTeamAnalytics = async (teamId) => {
  const team = await Team.findById(teamId);
  if (!team) throw ApiError.notFound('Team not found');

  // Win/loss ratio
  const completedMatches = await Match.find({
    $or: [{ teamA: teamId }, { teamB: teamId }],
    status: 'completed',
  });

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let totalRunsScored = 0;
  let totalOversFaced = 0;
  let totalRunsConceded = 0;
  let totalOversBowled = 0;

  for (const m of completedMatches) {
    if (m.result?.winner) {
      if (m.result.winner.toString() === teamId.toString()) wins += 1;
      else losses += 1;
    } else {
      ties += 1;
    }
  }

  // Head-to-head stats
  const headToHead = {};
  for (const m of completedMatches) {
    const opponentId =
      m.teamA.toString() === teamId.toString()
        ? m.teamB.toString()
        : m.teamA.toString();

    if (!headToHead[opponentId]) {
      headToHead[opponentId] = { wins: 0, losses: 0, ties: 0, total: 0 };
    }
    headToHead[opponentId].total += 1;

    if (m.result?.winner) {
      if (m.result.winner.toString() === teamId.toString()) {
        headToHead[opponentId].wins += 1;
      } else {
        headToHead[opponentId].losses += 1;
      }
    } else {
      headToHead[opponentId].ties += 1;
    }
  }

  // Populate opponent names
  const opponentIds = Object.keys(headToHead);
  const opponents = await Team.find({ _id: { $in: opponentIds } }).select('name logo');
  const headToHeadWithNames = opponents.map((opp) => ({
    team: { id: opp._id, name: opp.name, logo: opp.logo },
    ...headToHead[opp._id.toString()],
  }));

  // Recent form: last 5 matches
  const recentMatches = await Match.find({
    $or: [{ teamA: teamId }, { teamB: teamId }],
    status: 'completed',
  })
    .sort({ endTime: -1 })
    .limit(5)
    .populate('teamA', 'name')
    .populate('teamB', 'name')
    .populate('result.winner', 'name');

  const recentForm = recentMatches.map((m) => {
    let result = 'tie';
    if (m.result?.winner) {
      result = m.result.winner._id.toString() === teamId.toString() ? 'W' : 'L';
    } else {
      result = 'T';
    }
    const opponent =
      m.teamA._id.toString() === teamId.toString() ? m.teamB : m.teamA;
    return {
      matchId: m._id,
      opponent: opponent.name,
      result,
      summary: m.result?.summary || '',
    };
  });

  return {
    team: { id: team._id, name: team.name, logo: team.logo },
    overall: {
      played: completedMatches.length,
      wins,
      losses,
      ties,
      winPercentage: completedMatches.length > 0
        ? parseFloat(((wins / completedMatches.length) * 100).toFixed(1))
        : 0,
    },
    headToHead: headToHeadWithNames,
    recentForm,
  };
};

/**
 * ──────────────────────────────────────────
 *  HEAD-TO-HEAD (Specific)
 * ──────────────────────────────────────────
 */
const getHeadToHead = async (teamId, opponentId) => {
  const completedMatches = await Match.find({
    $or: [
      { teamA: teamId, teamB: opponentId },
      { teamA: opponentId, teamB: teamId }
    ],
    status: 'completed',
  })
    .sort({ endTime: -1 })
    .limit(10)
    .populate('teamA', 'name logo')
    .populate('teamB', 'name logo')
    .populate('result.winner', 'name');

  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (const m of completedMatches) {
    if (m.result?.winner) {
      if (m.result.winner._id.toString() === teamId.toString()) wins += 1;
      else losses += 1;
    } else {
      ties += 1;
    }
  }

  return {
    teamId,
    opponentId,
    stats: {
      total: completedMatches.length,
      wins,
      losses,
      ties,
    },
    recentMatches: completedMatches,
  };
};

/**
 * ──────────────────────────────────────────
 *  LEADERBOARD — per tournament (from MatchEvent)
 * ──────────────────────────────────────────
 */
const getLeaderboardByTournament = async (clubId, tournamentId, limit = 10) => {
  const mongoose = require('mongoose');
  const Player = require('../models/Player');
  const tournamentOid = new mongoose.Types.ObjectId(tournamentId);

  const matchIds = await Match.find({ tournamentId: tournamentOid, status: 'completed' }).distinct('_id');
  const empty = [];
  if (matchIds.length === 0) {
    return {
      topScorers: empty, topWicketTakers: empty, bestBattingAverage: empty,
      bestEconomyRate: empty, bestBowlingAverage: empty, mostFours: empty,
      mostSixes: empty, mostFifties: empty, mostHundreds: empty,
      highestScores: empty, mostDotBalls: empty, wicketHauls: empty,
      bestFielders: empty, mvp: empty,
    };
  }

  const [battingAgg, perInningsAgg, bowlingAgg, perMatchBowlingAgg, fieldingAgg] = await Promise.all([
    // Batting totals
    MatchEvent.aggregate([
      { $match: { matchId: { $in: matchIds } } },
      {
        $group: {
          _id: '$batsmanId',
          totalRuns: { $sum: '$runs' },
          fours: { $sum: { $cond: [{ $and: [{ $eq: ['$isBoundary', true] }, { $eq: ['$isSix', false] }] }, 1, 0] } },
          sixes: { $sum: { $cond: [{ $eq: ['$isSix', true] }, 1, 0] } },
          ballsFaced: { $sum: { $cond: [{ $and: [{ $eq: ['$isLegalDelivery', true] }, { $ne: ['$extras.type', 'wide'] }] }, 1, 0] } },
        },
      },
    ]),
    // Per-innings (for highestScore / fifties / hundreds / innings count)
    MatchEvent.aggregate([
      { $match: { matchId: { $in: matchIds } } },
      { $group: { _id: { matchId: '$matchId', inning: '$inning', batsmanId: '$batsmanId' }, inningsRuns: { $sum: '$runs' } } },
      {
        $group: {
          _id: '$_id.batsmanId',
          highestScore: { $max: '$inningsRuns' },
          fifties:  { $sum: { $cond: [{ $and: [{ $gte: ['$inningsRuns', 50] }, { $lt: ['$inningsRuns', 100] }] }, 1, 0] } },
          hundreds: { $sum: { $cond: [{ $gte: ['$inningsRuns', 100] }, 1, 0] } },
          totalInnings: { $sum: 1 },
        },
      },
    ]),
    // Bowling totals
    MatchEvent.aggregate([
      { $match: { matchId: { $in: matchIds } } },
      {
        $group: {
          _id: '$bowlerId',
          ballsBowled:    { $sum: { $cond: ['$isLegalDelivery', 1, 0] } },
          runsConceded:   { $sum: { $add: ['$runs', { $ifNull: ['$extras.runs', 0] }] } },
          wickets:        { $sum: { $cond: [{ $and: ['$isWicket', { $ne: ['$wicket.type', 'runout'] }] }, 1, 0] } },
          dotBallsBowled: {
            $sum: {
              $cond: [
                { $and: ['$isLegalDelivery', { $eq: ['$runs', 0] }, { $eq: [{ $ifNull: ['$extras.runs', 0] }, 0] }] },
                1, 0,
              ],
            },
          },
        },
      },
    ]),
    // Per-match bowling (for 5-wicket hauls)
    MatchEvent.aggregate([
      { $match: { matchId: { $in: matchIds }, isWicket: true, 'wicket.type': { $ne: 'runout' } } },
      { $group: { _id: { matchId: '$matchId', bowlerId: '$bowlerId' }, mw: { $sum: 1 } } },
      { $group: { _id: '$_id.bowlerId', fiveWicketHauls: { $sum: { $cond: [{ $gte: ['$mw', 5] }, 1, 0] } } } },
    ]),
    // Fielding (catches / stumpings / runouts via fielderId)
    MatchEvent.aggregate([
      { $match: { matchId: { $in: matchIds }, isWicket: true, 'wicket.fielderId': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$wicket.fielderId',
          catches:   { $sum: { $cond: [{ $eq: ['$wicket.type', 'caught'] },  1, 0] } },
          stumpings: { $sum: { $cond: [{ $eq: ['$wicket.type', 'stumped'] }, 1, 0] } },
          runOuts:   { $sum: { $cond: [{ $eq: ['$wicket.type', 'runout'] },  1, 0] } },
        },
      },
      { $addFields: { total: { $add: ['$catches', '$stumpings', '$runOuts'] } } },
      { $match: { total: { $gt: 0 } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  // Build lookup maps
  const perInningsMap = {};
  perInningsAgg.forEach(e => { perInningsMap[e._id?.toString()] = e; });
  const perMatchBowlMap = {};
  perMatchBowlingAgg.forEach(e => { perMatchBowlMap[e._id?.toString()] = e; });

  // Fetch players + teams
  const playerIds = new Set([
    ...battingAgg, ...bowlingAgg, ...fieldingAgg,
  ].map(e => e._id?.toString()).filter(Boolean));

  const players = await Player.find({ _id: { $in: [...playerIds] } }).populate('teamId', 'name logo').lean();
  const playerMap = {};
  players.forEach(p => { playerMap[p._id.toString()] = p; });

  const enrichPlayer = (id) => {
    const p = playerMap[id?.toString()];
    if (!p) return { id, name: 'Unknown', role: null, team: null };
    return { id: p._id, name: p.name, role: p.role, team: p.teamId || null };
  };

  // Enrich batting
  const enrichedBatting = battingAgg.map(b => {
    const inn = perInningsMap[b._id?.toString()];
    const totalInnings = inn?.totalInnings || 1;
    const battingAverage = parseFloat((b.totalRuns / totalInnings).toFixed(2));
    const strikeRate = b.ballsFaced > 0 ? parseFloat(((b.totalRuns / b.ballsFaced) * 100).toFixed(2)) : 0;
    return {
      player: enrichPlayer(b._id),
      totalRuns: b.totalRuns || 0, fours: b.fours || 0, sixes: b.sixes || 0,
      battingAverage, strikeRate,
      highestScore: inn?.highestScore || 0,
      fifties: inn?.fifties || 0,
      hundreds: inn?.hundreds || 0,
      totalInnings,
    };
  });

  // Enrich bowling
  const enrichedBowling = bowlingAgg.map(bw => {
    const pm = perMatchBowlMap[bw._id?.toString()];
    const economy = bw.ballsBowled > 0 ? parseFloat(((bw.runsConceded / bw.ballsBowled) * 6).toFixed(2)) : 0;
    const bowlingAverage = bw.wickets > 0 ? parseFloat((bw.runsConceded / bw.wickets).toFixed(2)) : 0;
    return {
      player: enrichPlayer(bw._id),
      totalWickets: bw.wickets || 0,
      totalOversBowled: parseFloat((Math.floor(bw.ballsBowled / 6) + (bw.ballsBowled % 6) / 10).toFixed(1)),
      economy, bowlingAverage,
      dotBallsBowled: bw.dotBallsBowled || 0,
      fiveWicketHauls: pm?.fiveWicketHauls || 0,
    };
  });

  // Enrich fielding
  const enrichedFielding = fieldingAgg.map(f => ({
    player: enrichPlayer(f._id),
    catches: f.catches || 0, stumpings: f.stumpings || 0, runOuts: f.runOuts || 0, total: f.total || 0,
  }));

  // MVP
  const allIds = [...new Set([...battingAgg, ...bowlingAgg, ...fieldingAgg].map(e => e._id?.toString()).filter(Boolean))];
  const mvp = allIds.map(pid => {
    const b  = battingAgg.find(x => x._id?.toString() === pid);
    const bw = bowlingAgg.find(x => x._id?.toString() === pid);
    const f  = fieldingAgg.find(x => x._id?.toString() === pid);
    const mvpScore = (b?.totalRuns || 0) + (bw?.wickets || 0) * 25 + ((f?.catches || 0) + (f?.stumpings || 0) + (f?.runOuts || 0)) * 10;
    return { player: enrichPlayer(pid), totalRuns: b?.totalRuns || 0, totalWickets: bw?.wickets || 0, catches: f?.catches || 0, mvpScore };
  }).filter(e => e.mvpScore > 0).sort((a, b) => b.mvpScore - a.mvpScore).slice(0, limit);

  const desc = (arr, key) => [...arr].sort((a, b) => b[key] - a[key]).slice(0, limit);
  const asc  = (arr, key) => [...arr].sort((a, b) => a[key] - b[key]).slice(0, limit);

  return {
    topScorers:        desc(enrichedBatting, 'totalRuns'),
    topWicketTakers:   desc(enrichedBowling, 'totalWickets'),
    bestBattingAverage: desc(enrichedBatting.filter(b => b.battingAverage > 0), 'battingAverage'),
    bestEconomyRate:   asc(enrichedBowling.filter(b => b.economy > 0), 'economy'),
    bestBowlingAverage: asc(enrichedBowling.filter(b => b.bowlingAverage > 0), 'bowlingAverage'),
    mostFours:         desc(enrichedBatting, 'fours'),
    mostSixes:         desc(enrichedBatting, 'sixes'),
    mostFifties:       desc(enrichedBatting.filter(b => b.fifties > 0), 'fifties'),
    mostHundreds:      desc(enrichedBatting.filter(b => b.hundreds > 0), 'hundreds'),
    highestScores:     desc(enrichedBatting, 'highestScore'),
    mostDotBalls:      desc(enrichedBowling, 'dotBallsBowled'),
    wicketHauls:       desc(enrichedBowling.filter(b => b.fiveWicketHauls > 0), 'fiveWicketHauls'),
    bestFielders:      enrichedFielding.slice(0, limit),
    mvp,
  };
};

/**
 * ──────────────────────────────────────────
 *  LEADERBOARDS
 * ──────────────────────────────────────────
 */
const getLeaderboard = async (clubId, { skip, limit }) => {
  const statQueries = [
    PlayerStatsCache.find({ clubId, totalRuns: { $gt: 0 } }).sort({ totalRuns: -1 }).skip(skip).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, totalWickets: { $gt: 0 } }).sort({ totalWickets: -1 }).skip(skip).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, battingAverage: { $gt: 0 }, totalInnings: { $gte: 3 } }).sort({ battingAverage: -1 }).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, economy: { $gt: 0 }, totalOversBowled: { $gte: 2 } }).sort({ economy: 1 }).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, fours: { $gt: 0 } }).sort({ fours: -1 }).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, sixes: { $gt: 0 } }).sort({ sixes: -1 }).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, fifties: { $gt: 0 } }).sort({ fifties: -1 }).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, hundreds: { $gt: 0 } }).sort({ hundreds: -1 }).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, highestScore: { $gt: 0 } }).sort({ highestScore: -1 }).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, dotBallsBowled: { $gt: 0 } }).sort({ dotBallsBowled: -1 }).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, fiveWicketHauls: { $gt: 0 } }).sort({ fiveWicketHauls: -1 }).limit(limit).populate('playerId', 'name role teamId').lean(),
    PlayerStatsCache.find({ clubId, bowlingAverage: { $gt: 0 }, totalWickets: { $gte: 3 } }).sort({ bowlingAverage: 1 }).limit(limit).populate('playerId', 'name role teamId').lean(),
  ];

  const [
    topScorers, topWicketTakers, bestBattingAvg, bestEconomy,
    mostFours, mostSixes, mostFifties, mostHundreds,
    highestScores, mostDotBalls, wicketHauls, bestBowlingAvg,
  ] = await Promise.all(statQueries);

  // Best fielders: sort by catches + stumpings + runOuts
  const fielders = await PlayerStatsCache.aggregate([
    { $match: { clubId: new (require('mongoose').Types.ObjectId)(clubId) } },
    { $addFields: { fieldingTotal: { $add: ['$catches', '$stumpings', '$runOuts'] } } },
    { $match: { fieldingTotal: { $gt: 0 } } },
    { $sort: { fieldingTotal: -1 } },
    { $limit: limit },
    { $lookup: { from: 'players', localField: 'playerId', foreignField: '_id', as: 'playerInfo' } },
    { $unwind: '$playerInfo' },
    { $project: { playerId: 1, playerName: '$playerInfo.name', playerRole: '$playerInfo.role', playerTeamId: '$playerInfo.teamId', catches: 1, stumpings: 1, runOuts: 1, fieldingTotal: 1 } },
  ]);

  // MVP score: runs + wickets*25 + catches*10
  const mvpList = await PlayerStatsCache.aggregate([
    { $match: { clubId: new (require('mongoose').Types.ObjectId)(clubId) } },
    { $addFields: { mvpScore: { $add: [{ $multiply: ['$totalRuns', 1] }, { $multiply: ['$totalWickets', 25] }, { $multiply: ['$catches', 10] }] } } },
    { $match: { mvpScore: { $gt: 0 } } },
    { $sort: { mvpScore: -1 } },
    { $limit: limit },
    { $lookup: { from: 'players', localField: 'playerId', foreignField: '_id', as: 'playerInfo' } },
    { $unwind: '$playerInfo' },
    { $project: { playerId: 1, playerName: '$playerInfo.name', playerRole: '$playerInfo.role', playerTeamId: '$playerInfo.teamId', totalRuns: 1, totalWickets: 1, catches: 1, mvpScore: 1 } },
  ]);

  // Collect all team IDs to enrich
  const teamIds = new Set();
  const allEntries = [
    ...topScorers, ...topWicketTakers, ...bestBattingAvg, ...bestEconomy,
    ...mostFours, ...mostSixes, ...mostFifties, ...mostHundreds,
    ...highestScores, ...mostDotBalls, ...wicketHauls, ...bestBowlingAvg,
  ];
  allEntries.forEach((s) => { if (s.playerId?.teamId) teamIds.add(s.playerId.teamId.toString()); });
  fielders.forEach((f) => { if (f.playerTeamId) teamIds.add(f.playerTeamId.toString()); });
  mvpList.forEach((m) => { if (m.playerTeamId) teamIds.add(m.playerTeamId.toString()); });

  const teams = await Team.find({ _id: { $in: [...teamIds] } }).select('name logo');
  const teamMap = {};
  teams.forEach((t) => { teamMap[t._id.toString()] = t; });

  const enrichPlayer = (entry) => ({
    player: {
      id: entry.playerId?._id,
      name: entry.playerId?.name,
      role: entry.playerId?.role,
      team: teamMap[entry.playerId?.teamId?.toString()] || null,
    },
    totalRuns: entry.totalRuns,
    totalWickets: entry.totalWickets,
    battingAverage: entry.battingAverage,
    strikeRate: entry.strikeRate,
    economy: entry.economy,
    bowlingAverage: entry.bowlingAverage,
    fours: entry.fours,
    sixes: entry.sixes,
    fifties: entry.fifties,
    hundreds: entry.hundreds,
    highestScore: entry.highestScore,
    dotBallsBowled: entry.dotBallsBowled,
    fiveWicketHauls: entry.fiveWicketHauls,
    totalMatches: entry.totalMatches,
  });

  return {
    topScorers: topScorers.map(enrichPlayer),
    topWicketTakers: topWicketTakers.map(enrichPlayer),
    bestBattingAverage: bestBattingAvg.map(enrichPlayer),
    bestEconomyRate: bestEconomy.map(enrichPlayer),
    bestBowlingAverage: bestBowlingAvg.map(enrichPlayer),
    mostFours: mostFours.map(enrichPlayer),
    mostSixes: mostSixes.map(enrichPlayer),
    mostFifties: mostFifties.map(enrichPlayer),
    mostHundreds: mostHundreds.map(enrichPlayer),
    highestScores: highestScores.map(enrichPlayer),
    mostDotBalls: mostDotBalls.map(enrichPlayer),
    wicketHauls: wicketHauls.map(enrichPlayer),
    bestFielders: fielders.map((f) => ({
      player: { id: f.playerId, name: f.playerName, role: f.playerRole, team: teamMap[f.playerTeamId?.toString()] || null },
      catches: f.catches,
      stumpings: f.stumpings,
      runOuts: f.runOuts,
      total: f.fieldingTotal,
    })),
    mvp: mvpList.map((m) => ({
      player: { id: m.playerId, name: m.playerName, role: m.playerRole, team: teamMap[m.playerTeamId?.toString()] || null },
      totalRuns: m.totalRuns,
      totalWickets: m.totalWickets,
      catches: m.catches,
      mvpScore: m.mvpScore,
    })),
  };
};

/**
 * ──────────────────────────────────────────
 *  MOST VALUABLE PLAYER (MVP aggregation)
 * ──────────────────────────────────────────
 */
const getMVP = async (clubId) => {
  const result = await PlayerStatsCache.aggregate([
    { $match: { clubId: new (require('mongoose').Types.ObjectId)(clubId) } },
    {
      $addFields: {
        mvpScore: {
          $add: [
            { $multiply: ['$totalRuns', 1] },
            { $multiply: ['$totalWickets', 25] },
            { $multiply: ['$catches', 10] },
          ],
        },
      },
    },
    { $sort: { mvpScore: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'players',
        localField: 'playerId',
        foreignField: '_id',
        as: 'playerInfo',
      },
    },
    { $unwind: '$playerInfo' },
    {
      $project: {
        playerId: 1,
        playerName: '$playerInfo.name',
        playerRole: '$playerInfo.role',
        totalRuns: 1,
        totalWickets: 1,
        catches: 1,
        mvpScore: 1,
      },
    },
  ]);

  return result;
};

/**
 * ──────────────────────────────────────────
 *  CLUB DASHBOARD AGGREGATE STATS
 * ──────────────────────────────────────────
 */
const getClubDashboardStats = async (clubId, tournamentId = null) => {
  const mongoose = require('mongoose');
  const oid = new mongoose.Types.ObjectId(clubId);

  if (tournamentId) {
    const tournamentOid = new mongoose.Types.ObjectId(tournamentId);
    const matchIds = await Match.find({ tournamentId: tournamentOid, status: 'completed' }).distinct('_id');

    const empty = { totalRuns: 0, totalWickets: 0, totalBallsBowled: 0, totalFours: 0, totalSixes: 0, totalCatches: 0, playerCount: 0 };
    if (matchIds.length === 0) return empty;

    const [battingAgg, wicketsAgg, catchesAgg, playerCountAgg] = await Promise.all([
      MatchEvent.aggregate([
        { $match: { matchId: { $in: matchIds } } },
        {
          $group: {
            _id: null,
            totalRuns: { $sum: '$runs' },
            totalBallsBowled: { $sum: { $cond: ['$isLegalDelivery', 1, 0] } },
            totalFours: { $sum: { $cond: [{ $and: [{ $eq: ['$isBoundary', true] }, { $eq: ['$isSix', false] }] }, 1, 0] } },
            totalSixes: { $sum: { $cond: [{ $eq: ['$isSix', true] }, 1, 0] } },
          },
        },
      ]),
      MatchEvent.aggregate([
        { $match: { matchId: { $in: matchIds }, isWicket: true, 'wicket.type': { $ne: 'runout' } } },
        { $group: { _id: null, totalWickets: { $sum: 1 } } },
      ]),
      MatchEvent.aggregate([
        { $match: { matchId: { $in: matchIds }, isWicket: true, 'wicket.type': 'caught' } },
        { $group: { _id: null, totalCatches: { $sum: 1 } } },
      ]),
      MatchEvent.distinct('batsmanId', { matchId: { $in: matchIds } }),
    ]);

    const b = battingAgg[0] || {};
    return {
      totalRuns: b.totalRuns || 0,
      totalWickets: wicketsAgg[0]?.totalWickets || 0,
      totalBallsBowled: b.totalBallsBowled || 0,
      totalFours: b.totalFours || 0,
      totalSixes: b.totalSixes || 0,
      totalCatches: catchesAgg[0]?.totalCatches || 0,
      playerCount: playerCountAgg.length,
    };
  }

  const [aggregates] = await PlayerStatsCache.aggregate([
    { $match: { clubId: oid } },
    {
      $group: {
        _id: null,
        totalRuns: { $sum: '$totalRuns' },
        totalWickets: { $sum: '$totalWickets' },
        totalBallsBowled: { $sum: '$totalBallsBowled' },
        totalFours: { $sum: '$fours' },
        totalSixes: { $sum: '$sixes' },
        totalCatches: { $sum: '$catches' },
        playerCount: { $sum: 1 },
      },
    },
  ]);

  return {
    totalRuns: aggregates?.totalRuns || 0,
    totalWickets: aggregates?.totalWickets || 0,
    totalBallsBowled: aggregates?.totalBallsBowled || 0,
    totalFours: aggregates?.totalFours || 0,
    totalSixes: aggregates?.totalSixes || 0,
    totalCatches: aggregates?.totalCatches || 0,
    playerCount: aggregates?.playerCount || 0,
  };
};

module.exports = {
  getPlayerAnalytics,
  getMatchAnalytics,
  getTeamAnalytics,
  getLeaderboard,
  getLeaderboardByTournament,
  getMVP,
  getHeadToHead,
  getClubDashboardStats,
};
