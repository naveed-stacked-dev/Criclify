const analyticsService = require('../services/analytics.service');
const ApiResponse = require('../utils/ApiResponse');
const { buildPaginationResponse } = require('../middlewares/pagination.middleware');

const getPlayerAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getPlayerAnalytics(req.params.id);
    res.json(ApiResponse.ok(data));
  } catch (error) {
    next(error);
  }
};

const getMatchAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getMatchAnalytics(req.params.id);
    res.json(ApiResponse.ok(data));
  } catch (error) {
    next(error);
  }
};

const getTeamAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getTeamAnalytics(req.params.id);
    res.json(ApiResponse.ok(data));
  } catch (error) {
    next(error);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const { tournamentId } = req.query;
    const data = tournamentId
      ? await analyticsService.getLeaderboardByTournament(clubId, tournamentId, req.pagination?.limit || 10)
      : await analyticsService.getLeaderboard(clubId, req.pagination);
    res.json(ApiResponse.ok(data));
  } catch (error) {
    next(error);
  }
};

const getPlayerForm = async (req, res, next) => {
  try {
    const data = await analyticsService.getPlayerAnalytics(req.params.id);
    res.json(ApiResponse.ok({ recentForm: data.recentForm }));
  } catch (error) {
    next(error);
  }
};

const getMatchGraph = async (req, res, next) => {
  try {
    const data = await analyticsService.getMatchAnalytics(req.params.id);
    res.json(ApiResponse.ok({
      runRateGraph: data.runRateGraph,
      manhattanChart: data.manhattanChart,
      wormChart: data.wormChart
    }));
  } catch (error) {
    next(error);
  }
};

const getHeadToHeadStats = async (req, res, next) => {
  try {
    const { id, opponentId } = req.params;
    const data = await analyticsService.getHeadToHead(id, opponentId);
    res.json(ApiResponse.ok(data));
  } catch (error) {
    next(error);
  }
};

const getClubDashboardStats = async (req, res, next) => {
  try {
    const data = await analyticsService.getClubDashboardStats(req.params.clubId);
    res.json(ApiResponse.ok(data));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlayerAnalytics,
  getMatchAnalytics,
  getTeamAnalytics,
  getLeaderboard,
  getPlayerForm,
  getMatchGraph,
  getHeadToHeadStats,
  getClubDashboardStats,
};
