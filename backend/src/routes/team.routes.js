const router = require('express').Router();
const teamController = require('../controllers/team.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { clubManagerOnly } = require('../middlewares/role.middleware');
const { attachTenant, requireClubAccess, injectClubId } = require('../middlewares/tenant.middleware');
const { paginate } = require('../middlewares/pagination.middleware');
const { handleMultipart, parseFormDataJson } = require('../middlewares/multipart.middleware');
const { validate } = require('../middlewares/validation.middleware');
const teamValidators = require('../validators/team.validator');

// Public team registration (no auth — submitted from the public club portal)
// Accepts multipart: team logo (field "logo"), player photos ("playerPhoto_<i>"), and a JSON "players" array.
router.post('/submit-public', handleMultipart, parseFormDataJson, validate(teamValidators.publicSubmitTeamSchema), teamController.submitPublic);

// Admin CRUD
router.post('/', authenticate, clubManagerOnly, attachTenant, injectClubId, handleMultipart, parseFormDataJson, validate(teamValidators.createTeamSchema), teamController.create);
router.get('/club/:clubId', authenticate, attachTenant, requireClubAccess, paginate, teamController.getByClub);
router.get('/:id', teamController.getById);
router.put('/:id', authenticate, clubManagerOnly, attachTenant, handleMultipart, parseFormDataJson, validate(teamValidators.updateTeamSchema), teamController.update);
router.delete('/:id', authenticate, clubManagerOnly, attachTenant, teamController.remove);

// Approve a publicly-submitted team
router.put('/:id/approve', authenticate, clubManagerOnly, attachTenant, teamController.approve);

// Team roster routes
router.post('/:id/add-player', authenticate, clubManagerOnly, attachTenant, validate(teamValidators.addPlayerSchema), teamController.addPlayer);
router.get('/:id/players', teamController.getPlayers);

module.exports = router;
