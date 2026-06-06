const playerService = require('../services/player.service');
const analyticsService = require('../services/analytics.service');
const ApiResponse = require('../utils/ApiResponse');
const { buildPaginationResponse } = require('../middlewares/pagination.middleware');
const { processUploadedFiles, safeDeleteImage } = require('../utils/imageHandler');

const PLAYER_IMAGE_FIELDS = [
  { fieldname: 'avatar', folder: (id) => `players/${id}/avatar`, bodyKey: 'avatar' },
];

const create = async (req, res, next) => {
  try {
    // For create, we don't have an ID yet — use a temp folder; service can update
    await processUploadedFiles({ ...req, params: { id: 'uploads' } }, PLAYER_IMAGE_FIELDS);
    const player = await playerService.createPlayer(req.body);
    res.status(201).json(ApiResponse.created(player));
  } catch (error) {
    next(error);
  }
};

const getByClub = async (req, res, next) => {
  try {
    let approvedFilter = null;
    if (req.query.approved === 'true') approvedFilter = true;
    if (req.query.approved === 'false') approvedFilter = false;

    const { players, total } = await playerService.getPlayersByClub(
      req.params.clubId,
      req.pagination,
      req.query.teamId || null,
      approvedFilter
    );
    const pagination = buildPaginationResponse(total, req.pagination);
    res.json(ApiResponse.paginated(players, pagination));
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await playerService.getPlayerById(req.params.id);
    res.json(ApiResponse.ok(data));
  } catch (error) {
    next(error);
  }
};

const getByTeam = async (req, res, next) => {
  try {
    const players = await playerService.getPlayersByTeam(req.params.teamId);
    res.json(ApiResponse.ok(players));
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { player: existing } = await playerService.getPlayerById(req.params.id);
    const oldAvatar = existing?.avatar;

    await processUploadedFiles(req, PLAYER_IMAGE_FIELDS);

    const player = await playerService.updatePlayer(req.params.id, req.body);

    // Delete old avatar from S3 if replaced
    if (req.body.avatar !== undefined && oldAvatar && oldAvatar !== player.avatar) {
      await safeDeleteImage(oldAvatar);
    }

    res.json(ApiResponse.ok(player, 'Player updated'));
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const { player: existing } = await playerService.getPlayerById(req.params.id);
    await playerService.deletePlayer(req.params.id);
    // Clean up avatar from S3
    if (existing?.avatar) await safeDeleteImage(existing.avatar);
    res.json(ApiResponse.ok(null, 'Player deleted'));
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await analyticsService.getPlayerAnalytics(req.params.id);
    res.json(ApiResponse.ok(stats));
  } catch (error) {
    next(error);
  }
};

const getRecentMatches = async (req, res, next) => {
  try {
    const matches = await playerService.getPlayerRecentMatches(req.params.id);
    res.json(ApiResponse.ok(matches));
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getByClub, getById, getByTeam, update, remove, getStats, getRecentMatches };
