const clubService = require('../services/club.service');
const matchService = require('../services/match.service');
const tournamentService = require('../services/tournament.service');
const scoringService = require('../services/scoring.service');
const playerService = require('../services/player.service');
const teamService = require('../services/team.service');
const analyticsService = require('../services/analytics.service');
const ApiResponse = require('../utils/ApiResponse');
const { buildPaginationResponse } = require('../middlewares/pagination.middleware');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const MatchSummary = require('../models/MatchSummary');
const { getCachedSummary } = require('../services/liveScoreRedis');

// We re-export only the reads that are publicly accessible without authentication.

// ─── Clubs ───
const getClubs = async (req, res, next) => {
  try {
    const { clubs, total } = await clubService.getAllClubs(req.pagination);
    const pagination = buildPaginationResponse(total, req.pagination);
    res.json(ApiResponse.paginated(clubs, pagination));
  } catch (error) {
    next(error);
  }
};

const getClubBySlug = async (req, res, next) => {
  try {
    const club = await clubService.getClubBySlug(req.params.slug);
    res.json(ApiResponse.ok(club));
  } catch (error) {
    next(error);
  }
};

// ─── Tournaments ───
const getTournamentsByClub = async (req, res, next) => {
  try {
    const filter = { clubId: req.params.clubId };
    if (req.query.status) filter.status = req.query.status;

    const [tournaments, total] = await Promise.all([
      Tournament.find(filter)
        .sort({ createdAt: -1 })
        .skip(req.pagination.skip)
        .limit(req.pagination.limit),
      Tournament.countDocuments(filter),
    ]);
    const pagination = buildPaginationResponse(total, req.pagination);
    res.json(ApiResponse.paginated(tournaments, pagination));
  } catch (error) {
    next(error);
  }
};

const getTournamentById = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json(ApiResponse.error('Tournament not found'));
    }
    res.json(ApiResponse.ok(tournament));
  } catch (error) {
    next(error);
  }
};

const getTournamentBracket = async (req, res, next) => {
  try {
    const matches = await Match.find({ tournamentId: req.params.id })
      .sort({ round: 1, matchOrder: 1 })
      .populate('teamA', 'name logo')
      .populate('teamB', 'name logo')
      .populate('result.winner', 'name logo');
    res.json(ApiResponse.ok(matches));
  } catch (error) {
    next(error);
  }
};

// ─── Matches ───
const getLiveMatches = async (req, res, next) => {
  try {
    const matches = await matchService.getLiveMatches(req.params.clubId);
    
    // Fetch cached live summaries from Redis for each match, fallback to DB
    const matchesWithSummaries = await Promise.all(matches.map(async (m) => {
      try {
        let summary = null;
        const cached = await getCachedSummary(m._id);
        if (cached && cached.summary) {
          summary = cached.summary;
        }
        // Always fetch from DB with populated player names for display
        const dbSummary = await MatchSummary.findOne({ matchId: m._id })
          .populate('currentBatsmen.striker.playerId', 'name')
          .populate('currentBatsmen.nonStriker.playerId', 'name')
          .populate('currentBowler.playerId', 'name')
          .lean();
        if (dbSummary) {
          // Merge: use Redis scores (fresher) but DB player names
          summary = summary ? {
            ...summary,
            currentBatsmen: dbSummary.currentBatsmen,
            currentBowler: dbSummary.currentBowler,
          } : dbSummary;
        }
        
        return {
          ...m.toObject(),
          summary
        };
      } catch (err) {
        return m.toObject();
      }
    }));

    res.json(ApiResponse.ok(matchesWithSummaries));
  } catch (error) {
    next(error);
  }
};

const getMatchesByClub = async (req, res, next) => {
  try {
    const filter = { clubId: req.params.clubId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.tournamentId) filter.tournamentId = req.query.tournamentId;

    const { matches, total } = await matchService.getMatches(filter, req.pagination);
    const pagination = buildPaginationResponse(total, req.pagination);
    res.json(ApiResponse.paginated(matches, pagination));
  } catch (error) {
    next(error);
  }
};

const getMatchesByTournament = async (req, res, next) => {
  try {
    const { matches, total } = await matchService.getMatchesByTournament(
      req.params.tournamentId,
      req.pagination
    );
    const pagination = buildPaginationResponse(total, req.pagination);
    res.json(ApiResponse.paginated(matches, pagination));
  } catch (error) {
    next(error);
  }
};

const getRecentMatches = async (req, res, next) => {
  try {
    const matches = await Match.find({
      clubId: req.params.clubId,
      status: 'completed',
    })
      .sort({ endTime: -1, updatedAt: -1 })
      .limit(parseInt(req.query.limit, 10) || 10)
      .populate('teamA', 'name logo')
      .populate('teamB', 'name logo')
      .populate('tournamentId', 'name')
      .populate('result.winner', 'name');
    res.json(ApiResponse.ok(matches));
  } catch (error) {
    next(error);
  }
};

const getMatchById = async (req, res, next) => {
  try {
    const match = await matchService.getMatchById(req.params.id);
    res.json(ApiResponse.ok(match));
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

const getMatchScorecard = async (req, res, next) => {
  try {
    const scorecard = await scoringService.getScorecard(req.params.id);
    res.json(ApiResponse.ok(scorecard));
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

// ─── Teams & Players ───
const getTeamsByClub = async (req, res, next) => {
  try {
    const { teams, total } = await teamService.getTeamsByClub(req.params.clubId, req.pagination);
    const pagination = buildPaginationResponse(total, req.pagination);
    res.json(ApiResponse.paginated(teams, pagination));
  } catch (error) {
    next(error);
  }
};

const getPlayersByClub = async (req, res, next) => {
  try {
    const { players, total } = await playerService.getPlayersByClub(req.params.clubId, req.pagination);
    const pagination = buildPaginationResponse(total, req.pagination);
    res.json(ApiResponse.paginated(players, pagination));
  } catch (error) {
    next(error);
  }
};

const getPlayerById = async (req, res, next) => {
  try {
    const { player, stats } = await playerService.getPlayerById(req.params.id);
    res.json(ApiResponse.ok({ player, stats }));
  } catch (error) {
    next(error);
  }
};


// ─── Analytics ───
const getClubLeaderboard = async (req, res, next) => {
  try {
    const data = await analyticsService.getLeaderboard(req.params.clubId, req.pagination);
    res.json(ApiResponse.ok(data));
  } catch (error) {
    next(error);
  }
};

// Tournament points table is public
const getPointsTable = async (req, res, next) => {
  try {
    const table = await tournamentService.getPointsTable(req.params.id);
    res.json(ApiResponse.ok(table));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClubs,
  getClubBySlug,
  getTournamentsByClub,
  getTournamentById,
  getTournamentBracket,
  getLiveMatches,
  getMatchesByClub,
  getMatchesByTournament,
  getRecentMatches,
  getMatchById,
  getMatchSummary,
  getMatchScorecard,
  getMatchEvents,
  getTeamsByClub,
  getPlayersByClub,
  getPlayerById,
  getClubLeaderboard,
  getPointsTable,
};
