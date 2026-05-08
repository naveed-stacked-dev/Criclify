const clubService = require('../services/club.service');
const ApiResponse = require('../utils/ApiResponse');
const { buildPaginationResponse } = require('../middlewares/pagination.middleware');
const { processUploadedFiles, safeDeleteImage, safeDeleteImages } = require('../utils/imageHandler');

/** Field configs for club image uploads */
const CLUB_IMAGE_FIELDS = [
  { fieldname: 'logo',      folder: (id) => `clubs/${id}/logo`,   bodyKey: 'logo' },
  { fieldname: 'bannerUrl', folder: (id) => `clubs/${id}/banner`, bodyKey: 'bannerUrl' },
];

const create = async (req, res, next) => {
  try {
    await processUploadedFiles(req, CLUB_IMAGE_FIELDS);
    const club = await clubService.createClub(req.body, req.user._id);
    res.status(201).json(ApiResponse.created(club));
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { clubs, total } = await clubService.getAllClubs(req.pagination);
    const pagination = buildPaginationResponse(total, req.pagination);
    res.json(ApiResponse.paginated(clubs, pagination));
  } catch (error) {
    next(error);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const club = await clubService.getClubBySlug(req.params.slug);
    res.json(ApiResponse.ok(club));
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const club = await clubService.getClubById(req.params.id);
    res.json(ApiResponse.ok(club));
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    // Fetch old club to get existing image URLs before overwriting
    const existing = await clubService.getClubById(req.params.id);
    const oldLogo = existing?.logo;
    const oldBanner = existing?.bannerUrl;

    await processUploadedFiles(req, CLUB_IMAGE_FIELDS);

    const club = await clubService.updateClub(req.params.id, req.body, req.user, req.userRole);

    // Delete old S3 images if they were replaced or removed
    const promises = [];
    if (req.body.logo !== undefined && oldLogo && oldLogo !== club.logo) {
      promises.push(safeDeleteImage(oldLogo));
    }
    if (req.body.bannerUrl !== undefined && oldBanner && oldBanner !== club.bannerUrl) {
      promises.push(safeDeleteImage(oldBanner));
    }
    await Promise.allSettled(promises);

    res.json(ApiResponse.ok(club, 'Club updated'));
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const existing = await clubService.getClubById(req.params.id);
    await clubService.deleteClub(req.params.id, req.user, req.userRole);
    // Clean up images from S3
    await safeDeleteImages([existing?.logo, existing?.bannerUrl]);
    res.json(ApiResponse.ok(null, 'Club deactivated'));
  } catch (error) {
    next(error);
  }
};

const updateTheme = async (req, res, next) => {
  try {
    const club = await clubService.updateTheme(req.params.id, req.body, req.user, req.userRole);
    res.json(ApiResponse.ok(club, 'Theme updated successfully'));
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const club = await clubService.updateSettings(req.params.id, req.body, req.user, req.userRole);
    res.json(ApiResponse.ok(club, 'Settings updated successfully'));
  } catch (error) {
    next(error);
  }
};

const updateLogo = async (req, res, next) => {
  try {
    const club = await clubService.updateLogo(req.params.id, req.body.logo, req.user, req.userRole);
    res.json(ApiResponse.ok(club, 'Logo updated successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getBySlug, getById, update, remove, updateTheme, updateSettings, updateLogo };
