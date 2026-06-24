const Match = require('../models/Match');
const MatchEvent = require('../models/MatchEvent');
const MatchSummary = require('../models/MatchSummary');
const PlayerStatsCache = require('../models/PlayerStatsCache');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');

/**
 * Start a match — initialize match summary and set status to live.
 */
const startMatch = async (matchId, tossData, performedBy) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status === 'completed') throw ApiError.conflict('Match is already completed');

  // CRITICAL: If a summary already exists (match was postponed mid-game),
  // prevent re-initialisation. The caller should use /resume instead.
  const existingSummary = await MatchSummary.findOne({ matchId });
  if (existingSummary) {
    throw ApiError.conflict(
      'A match summary already exists. Use the Resume endpoint to continue scoring.'
    );
  }

  // Set toss info
  match.toss = {
    wonBy: tossData.wonBy,
    decision: tossData.decision,
  };

  // Determine batting/bowling teams
  const tossWinner = tossData.wonBy.toString();
  const teamAId = match.teamA.toString();

  if (tossData.decision === 'bat') {
    match.battingTeam = tossData.wonBy;
    match.bowlingTeam = tossWinner === teamAId ? match.teamB : match.teamA;
  } else {
    match.bowlingTeam = tossData.wonBy;
    match.battingTeam = tossWinner === teamAId ? match.teamB : match.teamA;
  }

  match.status = 'live';
  match.currentInning = 1;
  match.startTime = new Date();
  await match.save();

  // Create match summary
  const summary = await MatchSummary.create({
    matchId: match._id,
    currentInning: 1,
    innings: {
      first: {
        battingTeamId: match.battingTeam,
        bowlingTeamId: match.bowlingTeam,
        score: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
      },
      second: {
        battingTeamId: match.bowlingTeam,
        bowlingTeamId: match.battingTeam,
        score: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
      },
    },
    status: 'live',
  });

  // Audit log
  await AuditLog.create({
    matchId,
    action: 'match_started',
    performedBy,
    description: `Match started. Toss won by team ${tossData.wonBy}, elected to ${tossData.decision}.`,
  });

  return { match, summary };
};

/**
 * Resume a match after crash or postponement — fetch existing summary state.
 * CRITICAL: Always restores battingTeam, bowlingTeam, currentInning from the
 * summary to prevent incorrect innings state after a mid-match reschedule.
 */
const resumeMatch = async (matchId, performedBy) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');

  const summary = await MatchSummary.findOne({ matchId })
    .populate('innings.first.battingTeamId', 'name')
    .populate('innings.first.bowlingTeamId', 'name')
    .populate('innings.second.battingTeamId', 'name')
    .populate('innings.second.bowlingTeamId', 'name');
  if (!summary) throw ApiError.notFound('No match summary found — cannot resume. Use Start Match instead.');

  // Restore accurate match state from the summary's source of truth.
  // This is the core fix for the "jumps to 2nd innings after postpone" bug.
  const inningKey = summary.currentInning === 1 ? 'first' : 'second';
  const activeInning = summary.innings[inningKey];

  if (activeInning?.battingTeamId) {
    // Store the raw ObjectId back (populate gives object; get _id)
    const battingId = activeInning.battingTeamId._id || activeInning.battingTeamId;
    const bowlingId = activeInning.bowlingTeamId?._id || activeInning.bowlingTeamId;
    match.battingTeam = battingId;
    match.bowlingTeam = bowlingId;
  }
  match.currentInning = summary.currentInning;

  // Only change status if not already live (e.g. resuming from upcoming/abandoned)
  if (match.status !== 'live') {
    match.status = 'live';
  }
  await match.save();

  if (summary.status !== 'live') {
    summary.status = 'live';
    await summary.save();
  }

  await AuditLog.create({
    matchId,
    action: 'match_resumed',
    performedBy,
    description: `Match scoring resumed. Innings: ${summary.currentInning}. Status restored.`,
  });

  return { match, summary };
};

/**
 * Pause a match (e.g. rain delay, mid-match interruption).
 * Sets match back to 'upcoming' status while preserving ALL summary data.
 * Resume must be used to continue — startMatch will be blocked.
 */
const pauseMatch = async (matchId, { reason, newStartTime }, performedBy) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status !== 'live') throw ApiError.conflict('Match is not currently live');

  const summary = await MatchSummary.findOne({ matchId });
  if (!summary) throw ApiError.summaryNotFound();

  // Snapshot current innings state inside the match document before pausing
  // so that resumeMatch can restore it perfectly.
  match.status = 'upcoming';

  // Preserve reschedule reason for display purposes
  if (reason) {
    match.rescheduleReason = reason;
    match.rescheduleAction = 'postpone';
  }

  // Update start time if provided (postponing)
  if (newStartTime && String(newStartTime).trim() !== '') {
    const date = new Date(newStartTime);
    if (!isNaN(date.getTime())) {
      match.startTime = date;
      match.rescheduleAction = 'postpone';
    }
  }

  await match.save();

  await AuditLog.create({
    matchId,
    action: 'match_paused',
    performedBy,
    description: `Match paused. Reason: ${reason || 'Not specified'}. ${newStartTime ? `Rescheduled to: ${newStartTime}` : ''} Innings: ${summary.currentInning}.`,
  });

  return { match, summary };
};

/**
 * Helper: Get current inning key from summary.
 */
const getInningKey = (inningNumber) => {
  if (inningNumber === 1) return 'first';
  if (inningNumber === 2) return 'second';
  if (inningNumber === 3) return 'superOverFirst';
  if (inningNumber === 4) return 'superOverSecond';
  return 'first'; // Fallback
};

/**
 * Add a scoring event (runs scored off the bat on a legal delivery).
 */
const addScore = async (matchId, eventData, performedBy) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status !== 'live') throw ApiError.conflict('Match is not live');

  const summary = await MatchSummary.findOne({ matchId });
  if (!summary) throw ApiError.summaryNotFound();

  const inningKey = getInningKey(summary.currentInning);
  const inning = summary.innings[inningKey];

  // Calculate over and ball
  const currentBall = inning.balls + 1;
  const over = Math.floor(currentBall / 6);  // 0-indexed completed overs
  const ballInOver = currentBall % 6 || 6;

  const isBoundary = eventData.runs === 4;
  const isSix = eventData.runs === 6;

  // Create match event
  const event = await MatchEvent.create({
    matchId,
    inning: summary.currentInning,
    over: Math.floor(inning.balls / 6), // current over (0-indexed)
    ball: ballInOver,
    batsmanId: eventData.batsmanId,
    bowlerId: eventData.bowlerId,
    runs: eventData.runs || 0,
    eventType: 'normal',
    isLegalDelivery: true,
    isBoundary,
    isSix,
    timestamp: new Date(),
  });

  // Update inning summary
  inning.score += eventData.runs || 0;
  inning.balls += 1;
  inning.overs = Math.floor(inning.balls / 6) + (inning.balls % 6) / 10;

  // Calculate run rate
  const totalOvers = inning.balls / 6;
  inning.runRate = totalOvers > 0 ? parseFloat((inning.score / totalOvers).toFixed(2)) : 0;

  // Update batsman in batting order
  updateBattingOrder(inning, eventData.batsmanId, eventData.runs, isBoundary, isSix);
  // Update bowler in bowling figures
  updateBowlingFigures(inning, eventData.bowlerId, eventData.runs, false, 1);

  // Update current batsmen display
  if (summary.currentBatsmen.striker &&
    summary.currentBatsmen.striker.playerId?.toString() === eventData.batsmanId.toString()) {
    summary.currentBatsmen.striker.runs += eventData.runs || 0;
    summary.currentBatsmen.striker.balls += 1;
    if (isBoundary) summary.currentBatsmen.striker.fours += 1;
    if (isSix) summary.currentBatsmen.striker.sixes += 1;
  }

  // Update current bowler display
  if (summary.currentBowler?.playerId?.toString() === eventData.bowlerId.toString()) {
    summary.currentBowler.balls += 1;
    summary.currentBowler.runs += eventData.runs || 0;
    if (summary.currentBowler.balls % 6 === 0) {
      summary.currentBowler.overs += 1;
      summary.currentBowler.balls = 0;
    }
  }

  // Swap strike on odd runs
  if ((eventData.runs || 0) % 2 !== 0) {
    swapStrike(summary);
  }

  // Swap strike at end of over
  if (inning.balls % 6 === 0) {
    swapStrike(summary);
  }

  // Update target info for second innings
  if (summary.currentInning === 2) {
    const firstInning = summary.innings.first;
    summary.target = firstInning.score + 1;
    const remainingRuns = summary.target - inning.score;
    const remainingBalls = (match.oversPerInning * 6) - inning.balls;
    const remainingOvers = remainingBalls / 6;
    summary.requiredRunRate = remainingOvers > 0
      ? parseFloat((remainingRuns / remainingOvers).toFixed(2))
      : 0;
  }

  summary.lastEvent = event._id;
  await summary.save();

  // Audit log
  await AuditLog.create({
    matchId,
    action: 'score_added',
    performedBy,
    eventData: { runs: eventData.runs, batsmanId: eventData.batsmanId },
    description: `${eventData.runs} runs scored.`,
  });

  return { event, summary };
};

/**
 * Record a wicket.
 */
const addWicket = async (matchId, eventData, performedBy) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status !== 'live') throw ApiError.conflict('Match is not live');

  const summary = await MatchSummary.findOne({ matchId });
  if (!summary) throw ApiError.summaryNotFound();

  const inningKey = getInningKey(summary.currentInning);
  const inning = summary.innings[inningKey];

  const isRunOut = eventData.wicketType === 'runout';
  const isLegal = !isRunOut || eventData.isLegalDelivery !== false;
  const currentBall = isLegal ? inning.balls + 1 : inning.balls;

  const event = await MatchEvent.create({
    matchId,
    inning: summary.currentInning,
    over: Math.floor(inning.balls / 6),
    ball: isLegal ? (currentBall % 6 || 6) : 0,
    batsmanId: eventData.batsmanId,
    bowlerId: eventData.bowlerId,
    runs: eventData.runs || 0,
    isWicket: true,
    wicket: {
      type: eventData.wicketType,
      playerId: eventData.outPlayerId || eventData.batsmanId,
      fielderId: eventData.fielderId || null,
    },
    eventType: 'wicket',
    isLegalDelivery: isLegal,
    timestamp: new Date(),
  });

  // Update inning summary
  inning.score += eventData.runs || 0;
  if (isLegal) inning.balls += 1;
  inning.wickets += 1;
  inning.overs = Math.floor(inning.balls / 6) + (inning.balls % 6) / 10;
  const totalOvers = inning.balls / 6;
  inning.runRate = totalOvers > 0 ? parseFloat((inning.score / totalOvers).toFixed(2)) : 0;

  // Mark batsman as out in batting order
  const outPlayerId = (eventData.outPlayerId || eventData.batsmanId).toString();
  const batsmanEntry = inning.battingOrder.find(
    (b) => b.playerId?.toString() === outPlayerId
  );
  let isDuckOut = false;
  if (batsmanEntry) {
    batsmanEntry.isOut = true;
    batsmanEntry.dismissalType = eventData.wicketType;

    // Duck-out: player dismissed with 0 runs
    if (batsmanEntry.runs === 0) {
      batsmanEntry.isDuckOut = true;
      isDuckOut = true;
    }
  }

  // Update bowler figures (wicket credited unless runout)
  if (!isRunOut) {
    updateBowlingFigures(inning, eventData.bowlerId, eventData.runs || 0, true, isLegal ? 1 : 0);
  } else {
    updateBowlingFigures(inning, eventData.bowlerId, eventData.runs || 0, false, isLegal ? 1 : 0);
  }

  // Set lastDuckOut on summary for real-time broadcast
  if (isDuckOut) {
    summary.lastDuckOut = {
      playerId: outPlayerId,
      playerName: eventData.outPlayerName || null,
      dismissalType: eventData.wicketType,
      timestamp: new Date(),
    };
  } else {
    // Clear any previous duck-out
    summary.lastDuckOut = { playerId: null, playerName: null, dismissalType: null, timestamp: null };
  }

  summary.lastEvent = event._id;
  await summary.save();

  // Audit log
  await AuditLog.create({
    matchId,
    action: 'wicket_added',
    performedBy,
    eventData: { wicketType: eventData.wicketType, outPlayerId, isDuckOut },
    description: `Wicket! ${eventData.wicketType}. Player ${outPlayerId} out.${isDuckOut ? ' DUCK OUT!' : ''}`,
  });

  return { event, summary, isDuckOut };
};

/**
 * Record an extra (wide, no-ball, bye, leg-bye).
 */
const addExtra = async (matchId, eventData, performedBy) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status !== 'live') throw ApiError.conflict('Match is not live');

  const summary = await MatchSummary.findOne({ matchId });
  if (!summary) throw ApiError.summaryNotFound();

  const inningKey = getInningKey(summary.currentInning);
  const inning = summary.innings[inningKey];

  const extraType = eventData.extraType; // 'wide', 'noball', 'bye', 'legbye'
  const isLegal = extraType !== 'wide' && extraType !== 'noball';
  const extraRuns = eventData.extraRuns || 1;
  const batsmanRuns = eventData.runs || 0;
  const totalRuns = extraRuns + batsmanRuns;

  const event = await MatchEvent.create({
    matchId,
    inning: summary.currentInning,
    over: Math.floor(inning.balls / 6),
    ball: isLegal ? ((inning.balls + 1) % 6 || 6) : 0,
    batsmanId: eventData.batsmanId,
    bowlerId: eventData.bowlerId,
    runs: batsmanRuns,
    extras: {
      type: extraType,
      runs: extraRuns,
    },
    eventType: extraType,
    isLegalDelivery: isLegal,
    timestamp: new Date(),
  });

  // Update inning
  inning.score += totalRuns;
  if (isLegal) inning.balls += 1;
  inning.overs = Math.floor(inning.balls / 6) + (inning.balls % 6) / 10;
  const totalOvers = inning.balls / 6;
  inning.runRate = totalOvers > 0 ? parseFloat((inning.score / totalOvers).toFixed(2)) : 0;

  // Update extras tracker
  if (!inning.extras) {
    inning.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
  }
  if (extraType === 'wide') inning.extras.wides += extraRuns;
  if (extraType === 'noball') inning.extras.noBalls += extraRuns;
  if (extraType === 'bye') inning.extras.byes += extraRuns;
  if (extraType === 'legbye') inning.extras.legByes += extraRuns;
  inning.extras.total += extraRuns;

  // Byes/legbyes don't credit the batsman, wides/noballs add to bowler's figures
  if (extraType === 'noball' || extraType === 'wide') {
    updateBowlingFigures(inning, eventData.bowlerId, totalRuns, false, 0);
  }

  summary.lastEvent = event._id;
  await summary.save();

  // Audit log
  await AuditLog.create({
    matchId,
    action: 'extra_added',
    performedBy,
    eventData: { extraType, extraRuns, batsmanRuns },
    description: `Extra: ${extraType} for ${totalRuns} runs.`,
  });

  return { event, summary };
};

/**
 * End match — compute result, update tournament points table.
 */
const endMatch = async (matchId, resultData, performedBy) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status !== 'live') throw ApiError.conflict('Match is not live');

  const summary = await MatchSummary.findOne({ matchId });

  match.status = 'completed';
  match.endTime = new Date();
  match.result = {
    winner: resultData.winner || null,
    margin: resultData.margin || '',
    summary: resultData.summary || '',
  };

  if (summary) {
    summary.status = 'completed';
    await summary.save();
  }

  await match.save();

  // Update player stats caches from all match events
  await recalculatePlayerStats(matchId);

  // Audit log
  await AuditLog.create({
    matchId,
    action: 'match_ended',
    performedBy,
    eventData: resultData,
    description: `Match ended. ${resultData.summary || ''}`,
  });

  return { match, summary };
};

/**
 * Save super over configuration when a match ends in a tie.
 * Sets match.superOver = true, summary.superOverOvers, resets innings to live for super over.
 */
const saveSuperOver = async (matchId, { overs }, performedBy) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status !== 'live') throw ApiError.conflict('Match is not live');

  const summary = await MatchSummary.findOne({ matchId });
  if (!summary) throw ApiError.summaryNotFound();
  if (summary.currentInning !== 2) throw ApiError.conflict('Super over can only be initiated after 2nd innings');

  const superOverOvers = parseInt(overs, 10);
  if (!superOverOvers || superOverOvers < 1) throw ApiError.badRequest('Super over overs must be at least 1');

  // Mark match as super over
  match.superOver = true;
  // Reset overs per inning for super over
  match.oversPerInning = superOverOvers;
  await match.save();

  // Store the super over overs count in summary
  summary.superOverOvers = superOverOvers;
  // Reset to 3rd innings (Super Over 1st innings) so scoring can restart for super over (teams swap)
  summary.currentInning = 3;
  // Initialize innings data for super over (keep original data safe in first/second innings slot)
  const origBatTeam = summary.innings.second.battingTeamId;
  const origBowlTeam = summary.innings.second.bowlingTeamId;
  summary.innings.superOverFirst = {
    battingTeamId: origBatTeam,
    bowlingTeamId: origBowlTeam,
    score: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    runRate: 0,
    battingOrder: [],
    bowlingFigures: [],
  };
  summary.innings.superOverSecond = {
    battingTeamId: origBowlTeam,
    bowlingTeamId: origBatTeam,
    score: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    runRate: 0,
    battingOrder: [],
    bowlingFigures: [],
  };
  summary.target = null;
  summary.requiredRunRate = null;
  summary.currentBatsmen = { striker: {}, nonStriker: {} };
  summary.currentBowler = {};
  summary.status = 'live';
  await summary.save();

  // Update match batting/bowling team to super over first batting team
  match.battingTeam = origBatTeam;
  match.bowlingTeam = origBowlTeam;
  match.currentInning = 3;
  await match.save();

  await AuditLog.create({
    matchId,
    action: 'super_over_started',
    performedBy,
    description: `Super over started. ${superOverOvers} over(s) per side.`,
  });

  return { match, summary };
};

/**
 * Undo the last ball event.
 * Deletes last event and fully recomputes summary from remaining events.
 */
const undoLastEvent = async (matchId, performedBy) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status !== 'live') throw ApiError.conflict('Match is not live');

  // Find the last event
  const lastEvent = await MatchEvent.findOne({ matchId })
    .sort({ timestamp: -1 })
    .limit(1);

  if (!lastEvent) {
    throw ApiError.badRequest('No events to undo');
  }

  // Delete the last event
  await MatchEvent.findByIdAndDelete(lastEvent._id);

  // Recompute the full summary from remaining events
  const summary = await recomputeSummary(matchId, match);

  // Audit log
  await AuditLog.create({
    matchId,
    action: 'undo',
    performedBy,
    eventData: { undoneEventId: lastEvent._id },
    description: `Undo: removed last event (${lastEvent.eventType}).`,
  });

  return { undoneEvent: lastEvent, summary };
};

/**
 * Switch to second innings.
 */
const switchInnings = async (matchId, performedBy) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');

  const summary = await MatchSummary.findOne({ matchId });
  if (!summary) throw ApiError.summaryNotFound();
  if (summary.currentInning === 2 && !match.superOver) {
    throw ApiError.conflict('Already in second innings');
  }
  if (summary.currentInning === 4) {
    throw ApiError.conflict('Already in second innings of super over');
  }

  const nextInning = summary.currentInning === 1 ? 2 : 4;

  summary.currentInning = nextInning;
  summary.status = 'live';
  summary.target = summary.currentInning === 2 
    ? summary.innings.first.score + 1
    : summary.innings.superOverFirst.score + 1;
    
  summary.currentBatsmen = { striker: {}, nonStriker: {} };
  summary.currentBowler = {};
  await summary.save();

  match.currentInning = nextInning;
  // Swap batting/bowling teams
  const temp = match.battingTeam;
  match.battingTeam = match.bowlingTeam;
  match.bowlingTeam = temp;
  await match.save();

  // Audit log
  await AuditLog.create({
    matchId,
    action: 'inning_switch',
    performedBy,
    description: `Innings switched. Target: ${summary.target}.`,
  });

  return { match, summary };
};

/**
 * Set current batsmen and bowler on the summary (for UI state).
 */
const setActivePlayers = async (matchId, { striker, nonStriker, bowler }) => {
  const summary = await MatchSummary.findOne({ matchId });
  if (!summary) throw ApiError.summaryNotFound();

  if (striker) {
    summary.currentBatsmen.striker = {
      playerId: striker,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
    };

    // Ensure in batting order
    const inningKey = getInningKey(summary.currentInning);
    const exists = summary.innings[inningKey].battingOrder.find(
      (b) => b.playerId?.toString() === striker.toString()
    );
    if (!exists) {
      summary.innings[inningKey].battingOrder.push({
        playerId: striker,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
      });
    }
  }

  if (nonStriker) {
    summary.currentBatsmen.nonStriker = {
      playerId: nonStriker,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
    };

    const inningKey = getInningKey(summary.currentInning);
    const exists = summary.innings[inningKey].battingOrder.find(
      (b) => b.playerId?.toString() === nonStriker.toString()
    );
    if (!exists) {
      summary.innings[inningKey].battingOrder.push({
        playerId: nonStriker,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
      });
    }
  }

  if (bowler) {
    summary.currentBowler = {
      playerId: bowler,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
    };

    const inningKey = getInningKey(summary.currentInning);
    const exists = summary.innings[inningKey].bowlingFigures.find(
      (b) => b.playerId?.toString() === bowler.toString()
    );
    if (!exists) {
      summary.innings[inningKey].bowlingFigures.push({
        playerId: bowler,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
        maidens: 0,
      });
    }
  }

  await summary.save();
  return summary;
};

/**
 * Get current match summary.
 */
const getMatchSummary = async (matchId) => {
  const summary = await MatchSummary.findOne({ matchId })
    .populate('currentBatsmen.striker.playerId', 'name avatar')
    .populate('currentBatsmen.nonStriker.playerId', 'name avatar')
    .populate('currentBowler.playerId', 'name avatar');
  if (!summary) throw ApiError.summaryNotFound();
  return summary;
};

/**
 * Add a substitute to the match summary.
 */
const addSubstitute = async (matchId, { substitutedIn, substitutedOut, reason }, performedBy) => {
  const summary = await MatchSummary.findOne({ matchId });
  if (!summary) throw ApiError.summaryNotFound();

  summary.substitutions.push({
    substitutedIn,
    substitutedOut,
    reason: reason || 'Injury',
    inning: summary.currentInning,
    timestamp: new Date()
  });

  await summary.save();

  await AuditLog.create({
    matchId,
    action: 'substitution',
    performedBy,
    eventData: { substitutedIn, substitutedOut, reason },
    description: `Substitution: Player ${substitutedIn} replaced ${substitutedOut} (${reason || 'Injury'}).`,
  });

  return summary;
};

// ─── HELPERS ─────────────────────────────────────────────────────────

function updateBattingOrder(inning, batsmanId, runs, isFour, isSix) {
  let entry = inning.battingOrder.find(
    (b) => b.playerId?.toString() === batsmanId.toString()
  );
  if (!entry) {
    entry = {
      playerId: batsmanId,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
    };
    inning.battingOrder.push(entry);
  }
  entry.runs += runs;
  entry.balls += 1;
  if (isFour) entry.fours += 1;
  if (isSix) entry.sixes += 1;
}

function updateBowlingFigures(inning, bowlerId, runs, isWicket, legalBalls) {
  let entry = inning.bowlingFigures.find(
    (b) => b.playerId?.toString() === bowlerId.toString()
  );
  if (!entry) {
    entry = {
      playerId: bowlerId,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      maidens: 0,
    };
    inning.bowlingFigures.push(entry);
  }
  entry.runs += runs;
  entry.balls += legalBalls;
  if (isWicket) entry.wickets += 1;
  const totalOvers = entry.balls / 6;
  entry.economy = totalOvers > 0 ? parseFloat((entry.runs / totalOvers).toFixed(2)) : 0;
  entry.overs = Math.floor(entry.balls / 6);
}

function cloneCurrentBatsman(batsman = {}) {
  return {
    playerId: batsman.playerId,
    runs: batsman.runs || 0,
    balls: batsman.balls || 0,
    fours: batsman.fours || 0,
    sixes: batsman.sixes || 0,
  };
}

function swapStrike(summary) {
  const striker = cloneCurrentBatsman(summary.currentBatsmen.striker);
  const nonStriker = cloneCurrentBatsman(summary.currentBatsmen.nonStriker);

  summary.currentBatsmen.striker = nonStriker;
  summary.currentBatsmen.nonStriker = striker;
  summary.markModified('currentBatsmen');
}

function buildCurrentBatsmanFromOrder(inning, playerId) {
  if (!playerId) return {};
  const entry = inning.battingOrder.find(
    (b) => b.playerId?.toString() === playerId.toString()
  );
  return {
    playerId,
    runs: entry?.runs || 0,
    balls: entry?.balls || 0,
    fours: entry?.fours || 0,
    sixes: entry?.sixes || 0,
  };
}

function buildCurrentBowlerFromFigures(inning, bowlerId) {
  if (!bowlerId) return {};
  const entry = inning.bowlingFigures.find(
    (b) => b.playerId?.toString() === bowlerId.toString()
  );
  if (!entry) return { playerId: bowlerId, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0 };
  return {
    playerId: bowlerId,
    overs: entry.overs || 0,
    balls: (entry.balls || 0) % 6,
    runs: entry.runs || 0,
    wickets: entry.wickets || 0,
    maidens: entry.maidens || 0,
  };
}

function getNextAvailableBatsman(seedOrder, inning, activeState) {
  return seedOrder.find((playerId) => {
    if (!playerId) return false;
    if (activeState.striker?.toString() === playerId.toString()) return false;
    if (activeState.nonStriker?.toString() === playerId.toString()) return false;

    const entry = inning.battingOrder.find(
      (b) => b.playerId?.toString() === playerId.toString()
    );
    return !entry?.isOut;
  });
}

/**
 * Recompute match summary from scratch using all remaining match events.
 * Called after an undo operation to ensure data consistency.
 */
async function recomputeSummary(matchId, match) {
  const events = await MatchEvent.find({ matchId }).sort({ timestamp: 1 });

  // Reset summary
  let summary = await MatchSummary.findOne({ matchId });
  if (!summary) throw ApiError.summaryNotFound();

  const startingCurrentInning = summary.currentInning || match.currentInning || 1;
  const startingCurrentInningKey = getInningKey(startingCurrentInning);
  const startingCurrentBowler = summary.currentBowler?.playerId || null;
  const seedBattingOrders = {
    first: [...(summary.innings.first?.battingOrder || [])].map((b) => b.playerId),
    second: [...(summary.innings.second?.battingOrder || [])].map((b) => b.playerId),
    superOverFirst: [...(summary.innings.superOverFirst?.battingOrder || [])].map((b) => b.playerId),
    superOverSecond: [...(summary.innings.superOverSecond?.battingOrder || [])].map((b) => b.playerId),
  };
  const activeByInning = {};
  const lastBowlerByInning = {};

  // Reset innings
  summary.innings.first = {
    battingTeamId: match.superOver ? summary.innings.first.battingTeamId : match.battingTeam,
    bowlingTeamId: match.superOver ? summary.innings.first.bowlingTeamId : match.bowlingTeam,
    score: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    runRate: 0,
    battingOrder: [],
    bowlingFigures: [],
  };
  summary.innings.second = {
    battingTeamId: match.superOver ? summary.innings.second.battingTeamId : match.bowlingTeam,
    bowlingTeamId: match.superOver ? summary.innings.second.bowlingTeamId : match.battingTeam,
    score: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    runRate: 0,
    battingOrder: [],
    bowlingFigures: [],
  };
  if (match.superOver) {
    summary.innings.superOverFirst = {
      battingTeamId: summary.innings.superOverFirst.battingTeamId,
      bowlingTeamId: summary.innings.superOverFirst.bowlingTeamId,
      score: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      runRate: 0,
      battingOrder: [],
      bowlingFigures: [],
    };
    summary.innings.superOverSecond = {
      battingTeamId: summary.innings.superOverSecond.battingTeamId,
      bowlingTeamId: summary.innings.superOverSecond.bowlingTeamId,
      score: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      runRate: 0,
      battingOrder: [],
      bowlingFigures: [],
    };
  }

  let currentInning = startingCurrentInning;

  for (const event of events) {
    currentInning = event.inning;
    const inningKey = getInningKey(event.inning);
    const inning = summary.innings[inningKey];
    if (!activeByInning[inningKey]) {
      const seedOrder = seedBattingOrders[inningKey].filter(Boolean);
      activeByInning[inningKey] = {
        striker: seedOrder[0] || event.batsmanId,
        nonStriker: seedOrder[1] || null,
      };
    }
    const activeState = activeByInning[inningKey];
    if (
      event.batsmanId &&
      activeState.striker?.toString() !== event.batsmanId.toString() &&
      activeState.nonStriker?.toString() === event.batsmanId.toString()
    ) {
      const temp = activeState.striker;
      activeState.striker = activeState.nonStriker;
      activeState.nonStriker = temp;
    } else if (event.batsmanId && activeState.striker?.toString() !== event.batsmanId.toString()) {
      activeState.striker = event.batsmanId;
    }
    lastBowlerByInning[inningKey] = event.bowlerId;

    const totalRuns = event.runs + (event.extras?.runs || 0);
    inning.score += totalRuns;

    if (event.isLegalDelivery) {
      inning.balls += 1;
    }

    if (event.isWicket) {
      inning.wickets += 1;
    }

    // Extras
    if (event.extras?.type) {
      if (event.extras.type === 'wide') inning.extras.wides += event.extras.runs;
      if (event.extras.type === 'noball') inning.extras.noBalls += event.extras.runs;
      if (event.extras.type === 'bye') inning.extras.byes += event.extras.runs;
      if (event.extras.type === 'legbye') inning.extras.legByes += event.extras.runs;
      inning.extras.total += event.extras.runs;
    }

    // Batting order
    if (event.isLegalDelivery || event.eventType === 'wicket') {
      updateBattingOrder(inning, event.batsmanId, event.runs, event.isBoundary, event.isSix);
    }

    // Bowling figures
    updateBowlingFigures(
      inning,
      event.bowlerId,
      totalRuns,
      event.isWicket && event.wicket?.type !== 'runout',
      event.isLegalDelivery ? 1 : 0
    );

    // Mark out batsman
    if (event.isWicket) {
      const outId = (event.wicket?.playerId || event.batsmanId).toString();
      const bEntry = inning.battingOrder.find(
        (b) => b.playerId?.toString() === outId
      );
      if (bEntry) {
        bEntry.isOut = true;
        bEntry.dismissalType = event.wicket?.type;
      }
      const nextBatsman = getNextAvailableBatsman(seedBattingOrders[inningKey], inning, activeState);
      if (activeState.striker?.toString() === outId) activeState.striker = nextBatsman || null;
      if (activeState.nonStriker?.toString() === outId) activeState.nonStriker = nextBatsman || null;
    }

    inning.overs = Math.floor(inning.balls / 6) + (inning.balls % 6) / 10;
    const overs = inning.balls / 6;
    inning.runRate = overs > 0 ? parseFloat((inning.score / overs).toFixed(2)) : 0;

    if (event.eventType === 'normal' && (event.runs || 0) % 2 !== 0) {
      const temp = activeState.striker;
      activeState.striker = activeState.nonStriker;
      activeState.nonStriker = temp;
    }
    if (event.eventType === 'normal' && inning.balls > 0 && inning.balls % 6 === 0) {
      const temp = activeState.striker;
      activeState.striker = activeState.nonStriker;
      activeState.nonStriker = temp;
    }
  }

  const currentInningKey = getInningKey(currentInning);
  const currentInningSummary = summary.innings[currentInningKey];
  const fallbackSeedOrder = seedBattingOrders[currentInningKey].filter(Boolean);
  const activeState = activeByInning[currentInningKey] || {
    striker: fallbackSeedOrder[0] || null,
    nonStriker: fallbackSeedOrder[1] || null,
  };
  summary.currentBatsmen = {
    striker: buildCurrentBatsmanFromOrder(currentInningSummary, activeState.striker),
    nonStriker: buildCurrentBatsmanFromOrder(currentInningSummary, activeState.nonStriker),
  };
  summary.currentBowler = buildCurrentBowlerFromFigures(
    currentInningSummary,
    lastBowlerByInning[currentInningKey] || (currentInningKey === startingCurrentInningKey ? startingCurrentBowler : null)
  );
  summary.currentInning = currentInning;
  summary.lastEvent = events.length > 0 ? events[events.length - 1]._id : null;
  summary.markModified('currentBatsmen');
  summary.markModified('currentBowler');
  await summary.save();

  return summary;
}

/**
 * Recalculate player stats from match events after match ends.
 */
async function recalculatePlayerStats(matchId) {
  const match = await Match.findById(matchId);
  if (!match) return;

  const events = await MatchEvent.find({ matchId });

  // Aggregate batting stats per player
  const playerBatting = {};
  const playerBowling = {};

  for (const event of events) {
    const batsmanId = event.batsmanId.toString();
    const bowlerId = event.bowlerId.toString();

    // Batting
    if (!playerBatting[batsmanId]) {
      playerBatting[batsmanId] = { runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0 };
    }
    if (event.isLegalDelivery && event.eventType !== 'wide') {
      playerBatting[batsmanId].runs += event.runs;
      playerBatting[batsmanId].balls += 1;
      if (event.runs === 0 && !event.isWicket) playerBatting[batsmanId].dots += 1;
      if (event.isBoundary) playerBatting[batsmanId].fours += 1;
      if (event.isSix) playerBatting[batsmanId].sixes += 1;
    }

    // Bowling
    if (!playerBowling[bowlerId]) {
      playerBowling[bowlerId] = { runs: 0, balls: 0, wickets: 0, dots: 0 };
    }
    const conceded = event.runs + (event.extras?.runs || 0);
    playerBowling[bowlerId].runs += conceded;
    if (event.isLegalDelivery) {
      playerBowling[bowlerId].balls += 1;
      if (conceded === 0) playerBowling[bowlerId].dots += 1;
    }
    if (event.isWicket && event.wicket?.type !== 'runout') {
      playerBowling[bowlerId].wickets += 1;
    }
  }

  // Update each player's stats cache
  for (const [playerId, batting] of Object.entries(playerBatting)) {
    await PlayerStatsCache.findOneAndUpdate(
      { playerId, clubId: match.clubId },
      {
        $inc: {
          totalRuns: batting.runs,
          totalBallsFaced: batting.balls,
          totalInnings: 1,
          fours: batting.fours,
          sixes: batting.sixes,
          dotBallsFaced: batting.dots,
          totalMatches: 0, // only increment once per player
        },
        $push: {
          recentScores: { $each: [batting.runs], $slice: -5 },
        },
      },
      { upsert: true }
    );

    // Recalculate derived stats
    const cache = await PlayerStatsCache.findOne({ playerId, clubId: match.clubId });
    if (cache) {
      cache.strikeRate = cache.totalBallsFaced > 0
        ? parseFloat(((cache.totalRuns / cache.totalBallsFaced) * 100).toFixed(2))
        : 0;
      cache.battingAverage = (cache.totalInnings - cache.notOuts) > 0
        ? parseFloat((cache.totalRuns / (cache.totalInnings - cache.notOuts)).toFixed(2))
        : cache.totalRuns;
      cache.boundaryPercentage = cache.totalBallsFaced > 0
        ? parseFloat((((cache.fours + cache.sixes) / cache.totalBallsFaced) * 100).toFixed(2))
        : 0;
      cache.dotBallPercentage = cache.totalBallsFaced > 0
        ? parseFloat(((cache.dotBallsFaced / cache.totalBallsFaced) * 100).toFixed(2))
        : 0;
      if (batting.runs > cache.highestScore) cache.highestScore = batting.runs;
      if (batting.runs >= 100) cache.hundreds += 1;
      else if (batting.runs >= 50) cache.fifties += 1;
      await cache.save();
    }
  }

  for (const [playerId, bowling] of Object.entries(playerBowling)) {
    await PlayerStatsCache.findOneAndUpdate(
      { playerId, clubId: match.clubId },
      {
        $inc: {
          totalWickets: bowling.wickets,
          totalBallsBowled: bowling.balls,
          totalRunsConceded: bowling.runs,
          dotBallsBowled: bowling.dots,
        },
        $push: {
          recentWickets: { $each: [bowling.wickets], $slice: -5 },
        },
      },
      { upsert: true }
    );

    const cache = await PlayerStatsCache.findOne({ playerId, clubId: match.clubId });
    if (cache) {
      const oversBowled = cache.totalBallsBowled / 6;
      cache.totalOversBowled = parseFloat(oversBowled.toFixed(1));
      cache.economy = oversBowled > 0
        ? parseFloat((cache.totalRunsConceded / oversBowled).toFixed(2))
        : 0;
      cache.bowlingAverage = cache.totalWickets > 0
        ? parseFloat((cache.totalRunsConceded / cache.totalWickets).toFixed(2))
        : 0;
      cache.bowlingStrikeRate = cache.totalWickets > 0
        ? parseFloat((cache.totalBallsBowled / cache.totalWickets).toFixed(2))
        : 0;
      const bestLine = `${bowling.wickets}/${bowling.runs}`;
      cache.bestBowling = bestLine; // Simplified; production would compare
      await cache.save();
    }
  }

  // Increment totalMatches for all unique players in this match
  const allPlayerIds = new Set([
    ...Object.keys(playerBatting),
    ...Object.keys(playerBowling),
  ]);
  for (const pid of allPlayerIds) {
    await PlayerStatsCache.findOneAndUpdate(
      { playerId: pid, clubId: match.clubId },
      { $inc: { totalMatches: 1 } }
    );
  }
}

/**
 * Get the full scorecard summary for a match.
 */
const getScorecard = async (matchId) => {
  const summary = await MatchSummary.findOne({ matchId })
    .populate('matchId')
    .populate('innings.first.battingTeamId', 'name logo')
    .populate('innings.first.bowlingTeamId', 'name logo')
    .populate('innings.second.battingTeamId', 'name logo')
    .populate('innings.second.bowlingTeamId', 'name logo')
    .populate('innings.first.battingOrder.playerId', 'name jerseyNumber avatar role')
    .populate('innings.first.bowlingFigures.playerId', 'name jerseyNumber avatar role')
    .populate('innings.second.battingOrder.playerId', 'name jerseyNumber avatar role')
    .populate('innings.second.bowlingFigures.playerId', 'name jerseyNumber avatar role')
    .populate('currentBatsmen.striker.playerId', 'name avatar')
    .populate('currentBatsmen.nonStriker.playerId', 'name avatar')
    .populate('currentBowler.playerId', 'name avatar');
  if (!summary) throw ApiError.summaryNotFound();
  return summary;
};

/**
 * Get all ball-by-ball events for a match.
 */
const getMatchEvents = async (matchId) => {
  const events = await MatchEvent.find({ matchId })
    .sort({ timestamp: -1 })
    .populate('batsmanId', 'name')
    .populate('bowlerId', 'name')
    .populate('wicket.playerId', 'name');
  return events;
};

/**
 * Get audit logs for a match.
 */
const getAuditLogs = async (matchId) => {
  const logs = await AuditLog.find({ matchId })
    .sort({ timestamp: -1 })
    .populate('managerId', 'name');
  return logs;
};

module.exports = {
  startMatch,
  resumeMatch,
  pauseMatch,
  addScore,
  addWicket,
  addExtra,
  endMatch,
  saveSuperOver,
  undoLastEvent,
  switchInnings,
  setActivePlayers,
  addSubstitute,
  getMatchSummary,
  getScorecard,
  getMatchEvents,
  getAuditLogs,
};
