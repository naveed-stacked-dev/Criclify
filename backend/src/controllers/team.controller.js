const teamService = require('../services/team.service');
const playerService = require('../services/player.service');
const ApiResponse = require('../utils/ApiResponse');
const { buildPaginationResponse } = require('../middlewares/pagination.middleware');
const { processUploadedFiles, safeDeleteImage } = require('../utils/imageHandler');

// Team logo field: multipart field 'logo' → stores in db as 'logo'
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
    const { teams, total } = await teamService.getTeamsByClub(
      req.params.clubId,
      req.pagination
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

    // Delete old logo from S3 if replaced
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

module.exports = { create, getByClub, getById, update, remove, addPlayer, getPlayers };
