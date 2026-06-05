const router = require('express').Router();
const analyticsController = require('../controllers/analytics.controller');
const { paginate } = require('../middlewares/pagination.middleware');

router.get('/player/:id', analyticsController.getPlayerAnalytics);
router.get('/player/:id/form', analyticsController.getPlayerForm);

router.get('/match/:id', analyticsController.getMatchAnalytics);
router.get('/match/:id/graph', analyticsController.getMatchGraph);

router.get('/team/:id', analyticsController.getTeamAnalytics);
router.get('/team/:id/head-to-head/:opponentId', analyticsController.getHeadToHeadStats);

router.get('/leaderboard/:clubId', paginate, analyticsController.getLeaderboard);
router.get('/dashboard/:clubId', analyticsController.getClubDashboardStats);

module.exports = router;
