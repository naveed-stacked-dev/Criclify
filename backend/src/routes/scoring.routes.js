const router = require('express').Router();
const scoringController = require('../controllers/scoring.controller');
const { authenticateMatchToken } = require('../middlewares/auth.middleware');
const { matchManagerOnly, anyManager } = require('../middlewares/role.middleware');

const { validate } = require('../middlewares/validation.middleware');
const matchValidators = require('../validators/match.validator');

// All scoring routes require match manager or higher auth
router.post('/:id/start', authenticateMatchToken, anyManager, validate(matchValidators.startMatchSchema), scoringController.startMatch);
router.post('/:id/resume', authenticateMatchToken, anyManager, scoringController.resumeMatch);
router.post('/:id/pause', authenticateMatchToken, anyManager, scoringController.pauseMatch);
router.post('/:id/score', authenticateMatchToken, anyManager, validate(matchValidators.addScoreSchema), scoringController.addScore);
router.post('/:id/wicket', authenticateMatchToken, anyManager, validate(matchValidators.addWicketSchema), scoringController.addWicket);
router.post('/:id/extra', authenticateMatchToken, anyManager, validate(matchValidators.addExtraSchema), scoringController.addExtra);
router.post('/:id/end', authenticateMatchToken, anyManager, validate(matchValidators.endMatchSchema), scoringController.endMatch);
router.post('/:id/undo', authenticateMatchToken, anyManager, scoringController.undoLastEvent);
router.post('/:id/switch-innings', authenticateMatchToken, anyManager, scoringController.switchInnings);
router.post('/:id/super-over', authenticateMatchToken, anyManager, scoringController.saveSuperOver);
router.post('/:id/set-players', authenticateMatchToken, anyManager, validate(matchValidators.setActivePlayersSchema), scoringController.setActivePlayers);

// Public read
router.get('/:id/summary', scoringController.getMatchSummary);
router.get('/:id/scorecard', scoringController.getScorecard);
router.get('/:id/events', scoringController.getMatchEvents);
router.get('/:id/audit-logs', scoringController.getAuditLogs);

module.exports = router;
