const teamService = require('../services/team.service');
const playerService = require('../services/player.service');
const s3Service = require('../services/s3Service');
const ApiResponse = require('../utils/ApiResponse');
const { buildPaginationResponse } = require('../middlewares/pagination.middleware');
const { processUploadedFiles, safeDeleteImage } = require('../utils/imageHandler');

const TEAM_IMAGE_FIELDS = [
  { fieldname: 'logo', folder: (id) => `teams/${id}/logo`, bodyKey: 'logo' },
];

const create = async (req, res, next) => {
  try {
    await processUploadedFiles({ ...req, params: { id: 'uploads' } }, TEAM_IMAGE_FIELDS);
    const team = await teamService.createTeam(req.body);
    res.status(201).json(ApiResponse.created(team));
  } catch (error) {
    next(error);
  }
};

const getByClub = async (req, res, next) => {
  try {
    let approvedFilter = null;
    if (req.query.approved === 'true') approvedFilter = true;
    if (req.query.approved === 'false') approvedFilter = false;

    const { teams, total } = await teamService.getTeamsByClub(
      req.params.clubId,
      req.pagination,
      approvedFilter
    );
    const pagination = buildPaginationResponse(total, req.pagination);
    res.json(ApiResponse.paginated(teams, pagination));
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const team = await teamService.getTeamById(req.params.id);
    res.json(ApiResponse.ok(team));
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const existing = await teamService.getTeamById(req.params.id);
    const oldLogo = existing?.logo;

    await processUploadedFiles(req, TEAM_IMAGE_FIELDS);

    const team = await teamService.updateTeam(req.params.id, req.body);

    if (req.body.logo !== undefined && oldLogo && oldLogo !== team.logo) {
      await safeDeleteImage(oldLogo);
    }

    res.json(ApiResponse.ok(team, 'Team updated'));
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const existing = await teamService.getTeamById(req.params.id);
    await teamService.deleteTeam(req.params.id);
    if (existing?.logo) await safeDeleteImage(existing.logo);
    res.json(ApiResponse.ok(null, 'Team deleted'));
  } catch (error) {
    next(error);
  }
};

const addPlayer = async (req, res, next) => {
  try {
    const player = await teamService.addPlayerToTeam(req.params.id, req.body.playerId);
    res.json(ApiResponse.ok(player, 'Player added to team successfully'));
  } catch (error) {
    next(error);
  }
};

const getPlayers = async (req, res, next) => {
  try {
    const players = await playerService.getPlayersByTeam(req.params.id);
    res.json(ApiResponse.ok(players));
  } catch (error) {
    next(error);
  }
};

const submitPublic = async (req, res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const players = Array.isArray(req.body.players) ? req.body.players : [];

    // Upload team logo (multipart field "logo")
    let logoUrl = null;
    const logoFile = files.find((f) => f.fieldname === 'logo');
    if (logoFile) {
      const key = s3Service.generateKey('teams/uploads/logo', logoFile.originalname);
      logoUrl = await s3Service.uploadToS3(logoFile.buffer, key, logoFile.mimetype);
    }

    // Upload player photos (multipart fields "playerPhoto_<index>") and attach to players[index]
    const photoFiles = files.filter((f) => f.fieldname.startsWith('playerPhoto_'));
    await Promise.all(
      photoFiles.map(async (f) => {
        const idx = parseInt(f.fieldname.split('_')[1], 10);
        if (Number.isNaN(idx) || !players[idx]) return;
        const key = s3Service.generateKey('players/uploads/avatar', f.originalname);
        players[idx].avatar = await s3Service.uploadToS3(f.buffer, key, f.mimetype);
      })
    );

    const result = await teamService.submitTeamPublic({
      clubId: req.body.clubId,
      name: req.body.name,
      logo: logoUrl,
      players,
    });
    res.status(201).json(ApiResponse.created(result, 'Team registration submitted successfully'));
  } catch (error) {
    next(error);
  }
};

const approve = async (req, res, next) => {
  try {
    const team = await teamService.approveTeam(req.params.id);
    res.json(ApiResponse.ok(team, 'Team approved successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getByClub, getById, update, remove, addPlayer, getPlayers, submitPublic, approve };
