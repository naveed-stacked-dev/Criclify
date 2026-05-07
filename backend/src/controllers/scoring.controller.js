const scoringService = require('../services/scoring.service');
const ApiResponse = require('../utils/ApiResponse');

const startMatch = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.startMatch(req.params.id, req.body, performedBy);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`match_${req.params.id}`).emit('match_started', result);
    }

    res.status(201).json(ApiResponse.created(result, 'Match started'));
  } catch (error) {
    next(error);
  }
};

const resumeMatch = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.resumeMatch(req.params.id, performedBy);
    const io = req.app.get('io');
    if (io) {
      io.to(`match_${req.params.id}`).emit('match_resumed', result);
    }
    res.json(ApiResponse.ok(result, 'Match resumed'));
  } catch (error) {
    next(error);
  }
};

const pauseMatch = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const reason = req.body?.reason || '';
    const result = await scoringService.pauseMatch(req.params.id, reason, performedBy);
    const io = req.app.get('io');
    if (io) {
      io.to(`match_${req.params.id}`).emit('match_paused', result);
    }
    res.json(ApiResponse.ok(result, 'Match paused'));
  } catch (error) {
    next(error);
  }
};

const addScore = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.addScore(req.params.id, req.body, performedBy);

    const io = req.app.get('io');
    if (io) {
      io.to(`match_${req.params.id}`).emit('score_update', result.event);
      io.to(`match_${req.params.id}`).emit('match_summary', result.summary);
    }

    res.status(201).json(ApiResponse.created(result, 'Score recorded'));
  } catch (error) {
    next(error);
  }
};

const addWicket = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.addWicket(req.params.id, req.body, performedBy);

    const io = req.app.get('io');
    if (io) {
      io.to(`match_${req.params.id}`).emit('score_update', result.event);
      io.to(`match_${req.params.id}`).emit('match_summary', result.summary);
      io.to(`match_${req.params.id}`).emit('wicket', result.event);
    }

    res.status(201).json(ApiResponse.created(result, 'Wicket recorded'));
  } catch (error) {
    next(error);
  }
};

const addExtra = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.addExtra(req.params.id, req.body, performedBy);

    const io = req.app.get('io');
    if (io) {
      io.to(`match_${req.params.id}`).emit('score_update', result.event);
      io.to(`match_${req.params.id}`).emit('match_summary', result.summary);
    }

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
    if (io) {
      io.to(`match_${req.params.id}`).emit('match_ended', result);
    }

    res.json(ApiResponse.ok(result, 'Match ended'));
  } catch (error) {
    next(error);
  }
};

const undoLastEvent = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.undoLastEvent(req.params.id, performedBy);

    const io = req.app.get('io');
    if (io) {
      io.to(`match_${req.params.id}`).emit('undo', result.undoneEvent);
      io.to(`match_${req.params.id}`).emit('match_summary', result.summary);
    }

    res.json(ApiResponse.ok(result, 'Last event undone'));
  } catch (error) {
    next(error);
  }
};

const switchInnings = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.switchInnings(req.params.id, performedBy);

    const io = req.app.get('io');
    if (io) {
      io.to(`match_${req.params.id}`).emit('innings_switch', result);
    }

    res.json(ApiResponse.ok(result, 'Innings switched'));
  } catch (error) {
    next(error);
  }
};

const saveSuperOver = async (req, res, next) => {
  try {
    const performedBy = { id: req.user._id, role: req.userRole };
    const result = await scoringService.saveSuperOver(req.params.id, req.body, performedBy);

    const io = req.app.get('io');
    if (io) {
      io.to(`match_${req.params.id}`).emit('super_over_started', result);
    }

    res.json(ApiResponse.ok(result, 'Super over started'));
  } catch (error) {
    next(error);
  }
};

const setActivePlayers = async (req, res, next) => {
  try {
    const summary = await scoringService.setActivePlayers(req.params.id, req.body);
    res.json(ApiResponse.ok(summary, 'Active players set'));
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
  getMatchSummary,
  getScorecard,
  getMatchEvents,
  getAuditLogs,
};
