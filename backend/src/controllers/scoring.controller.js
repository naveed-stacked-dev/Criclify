const scoringService = require('../services/scoring.service');
const ApiResponse = require('../utils/ApiResponse');
const Match = require('../models/Match');
const { publishMatchSummary, removeLiveMatch } = require('../services/liveScoreRedis');

/**
 * Helper: resolve clubId from the match document.
 */
const getClubId = async (matchId) => {
  const match = await Match.findById(matchId).select('clubId').lean();
  return match?.clubId?.toString() || null;
};

/**
 * Helper: emit socket events AND publish to Redis for real-time updates.
 */
const broadcastUpdate = async (req, matchId, eventName, result) => {
  const io = req.app.get('io');
  const clubId = await getClubId(matchId);

  // Populate player names in the summary for the frontend
  if (result.summary && typeof result.summary.populate === 'function') {
    await result.summary.populate([
      { path: 'currentBatsmen.striker.playerId', select: 'name' },
      { path: 'currentBatsmen.nonStriker.playerId', select: 'name' },
      { path: 'currentBowler.playerId', select: 'name' }
    ]);
  }

  // Direct socket emit (fallback if Redis is down)
  if (io) {
    io.to(`match_${matchId}`).emit(eventName, result);
    if (result.summary) {
      io.to(`match_${matchId}`).emit('match_summary', result.summary);
    }
    // Also broadcast to club room for club home page
    if (clubId) {
      io.to(`club_${clubId}`).emit('club_live_update', { matchId, clubId, summary: result.summary });
    }
  }

  // Publish to Redis for cross-instance broadcasting
  if (result.summary) {
    await publishMatchSummary(matchId, clubId, result.summary);
  }
};

const startMatch = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.startMatch(req.params.id, req.body, performedBy);
    await broadcastUpdate(req, req.params.id, 'match_started', result);
    res.status(201).json(ApiResponse.created(result, 'Match started'));
  } catch (error) {
    next(error);
  }
};

const resumeMatch = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.resumeMatch(req.params.id, performedBy);
    await broadcastUpdate(req, req.params.id, 'match_resumed', result);
    res.json(ApiResponse.ok(result, 'Match resumed'));
  } catch (error) {
    next(error);
  }
};

const pauseMatch = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.pauseMatch(req.params.id, req.body, performedBy);
    await broadcastUpdate(req, req.params.id, 'match_paused', result);
    res.json(ApiResponse.ok(result, 'Match paused'));
  } catch (error) {
    next(error);
  }
};

const addScore = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.addScore(req.params.id, req.body, performedBy);
    await broadcastUpdate(req, req.params.id, 'score_update', { event: result.event, summary: result.summary });
    res.status(201).json(ApiResponse.created(result, 'Score recorded'));
  } catch (error) {
    next(error);
  }
};

const addWicket = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.addWicket(req.params.id, req.body, performedBy);
    await broadcastUpdate(req, req.params.id, 'wicket', { event: result.event, summary: result.summary });
    res.status(201).json(ApiResponse.created(result, 'Wicket recorded'));
  } catch (error) {
    next(error);
  }
};

const addExtra = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.addExtra(req.params.id, req.body, performedBy);
    await broadcastUpdate(req, req.params.id, 'extra_update', { event: result.event, summary: result.summary });
    res.status(201).json(ApiResponse.created(result, 'Extra recorded'));
  } catch (error) {
    next(error);
  }
};

const endMatch = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.endMatch(req.params.id, req.body, performedBy);

    const io = req.app.get('io');
    const clubId = await getClubId(req.params.id);
    if (io) {
      io.to(`match_${req.params.id}`).emit('match_ended', result);
      // Notify club room so frontend removes match from live list
      if (clubId) {
        io.to(`club_${clubId}`).emit('match_ended', { matchId: req.params.id });
      }
    }

    // Remove from Redis live cache
    await removeLiveMatch(req.params.id);

    res.json(ApiResponse.ok(result, 'Match ended'));
  } catch (error) {
    next(error);
  }
};

const undoLastEvent = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.undoLastEvent(req.params.id, performedBy);
    await broadcastUpdate(req, req.params.id, 'undo', { undoneEvent: result.undoneEvent, summary: result.summary });
    res.json(ApiResponse.ok(result, 'Last event undone'));
  } catch (error) {
    next(error);
  }
};

const switchInnings = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.switchInnings(req.params.id, performedBy);
    await broadcastUpdate(req, req.params.id, 'innings_switch', result);
    res.json(ApiResponse.ok(result, 'Innings switched'));
  } catch (error) {
    next(error);
  }
};

const saveSuperOver = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.saveSuperOver(req.params.id, req.body, performedBy);
    await broadcastUpdate(req, req.params.id, 'super_over_started', result);
    res.json(ApiResponse.ok(result, 'Super over started'));
  } catch (error) {
    next(error);
  }
};

const setActivePlayers = async (req, res, next) => {
  try {
    const summary = await scoringService.setActivePlayers(req.params.id, req.body);
    await broadcastUpdate(req, req.params.id, 'active_players_update', { summary });
    res.json(ApiResponse.ok(summary, 'Active players set'));
  } catch (error) {
    next(error);
  }
};

const addSubstitute = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const summary = await scoringService.addSubstitute(req.params.id, req.body, performedBy);
    await broadcastUpdate(req, req.params.id, 'match_summary', { summary });
    res.json(ApiResponse.ok(summary, 'Substitute added successfully'));
  } catch (error) {
    next(error);
  }
};

const getMatchSummary = async (req, res, next) => {
  try {
    const summary = await scoringService.getMatchSummary(req.params.id);
    res.json(ApiResponse.ok(summary));
  } catch (error) {
    next(error);
  }
};

const getScorecard = async (req, res, next) => {
  try {
    const summary = await scoringService.getScorecard(req.params.id);
    res.json(ApiResponse.ok(summary));
  } catch (error) {
    next(error);
  }
};

const getMatchEvents = async (req, res, next) => {
  try {
    const events = await scoringService.getMatchEvents(req.params.id);
    res.json(ApiResponse.ok(events));
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await scoringService.getAuditLogs(req.params.id);
    res.json(ApiResponse.ok(logs));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startMatch,
  resumeMatch,
  pauseMatch,
  addScore,
  addWicket,
  addExtra,
  endMatch,
  undoLastEvent,
  switchInnings,
  saveSuperOver,
  setActivePlayers,
  addSubstitute,
  getMatchSummary,
  getScorecard,
  getMatchEvents,
  getAuditLogs,
};
