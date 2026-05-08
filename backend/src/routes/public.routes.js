const router = require('express').Router();
const publicController = require('../controllers/public.controller');
const { paginate } = require('../middlewares/pagination.middleware');

// Public endpoints that don't require authentication, allowing the frontend visitor view

// ─── Clubs ───
router.get('/clubs', paginate, publicController.getClubs);
router.get('/club/slug/:slug', publicController.getClubBySlug);

// ─── Tournaments by Club ───
router.get('/tournaments/club/:clubId', paginate, publicController.getTournamentsByClub);
router.get('/tournaments/:id', publicController.getTournamentById);
router.get('/tournaments/:id/points-table', publicController.getPointsTable);
router.get('/tournaments/:id/bracket', publicController.getTournamentBracket);

// ─── Matches ───
router.get('/matches/club/:clubId', paginate, publicController.getMatchesByClub);
router.get('/matches/tournament/:tournamentId', paginate, publicController.getMatchesByTournament);
router.get('/matches/recent/:clubId', publicController.getRecentMatches);
router.get('/live-matches/:clubId', publicController.getLiveMatches);
router.get('/matches/:id', publicController.getMatchById);
router.get('/matches/:id/summary', publicController.getMatchSummary);
router.get('/matches/:id/scorecard', publicController.getMatchScorecard);
router.get('/matches/:id/events', publicController.getMatchEvents);

// ─── Teams & Players ───
router.get('/teams/club/:clubId', paginate, publicController.getTeamsByClub);
router.get('/players/club/:clubId', paginate, publicController.getPlayersByClub);
router.get('/players/:id', publicController.getPlayerById);

// ─── Leaderboard ───
router.get('/leaderboard/:clubId', paginate, publicController.getClubLeaderboard);

module.exports = router;
