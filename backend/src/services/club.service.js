const Club = require('../models/Club');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../utils/constants');

const checkClubAccess = (club, user, role) => {
  if (role === ROLES.SUPER_ADMIN) return;
  if (role === ROLES.CLUB_MANAGER && club._id.toString() === user.clubId?.toString()) return;
  throw ApiError.forbidden('You can only update your own club');
};

/**
 * Create a new club.
 */
const createClub = async (data, superAdminId) => {
  // Generate slug from name if not provided
  if (!data.slug) {
    data.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  const existingClub = await Club.findOne({ slug: data.slug });
  if (existingClub) {
    throw ApiError.conflict('A club with this slug already exists');
  }

  const club = await Club.create({
    ...data,
    createdBy: superAdminId,
  });

  return club;
};

/**
 * Get all clubs with pagination.
 */
const getAllClubs = async ({ skip, limit }) => {
  const [clubs, total] = await Promise.all([
    Club.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email'),
    Club.countDocuments({ isActive: true }),
  ]);

  return { clubs, total };
};

/**
 * Get a single club by slug.
 */
const getClubBySlug = async (slug) => {
  const club = await Club.findOne({ slug, isActive: true }).populate(
    'createdBy',
    'name email'
  );
  if (!club) {
    throw ApiError.notFound('Club not found');
  }
  return club;
};

/**
 * Get a single club by ID.
 */
const getClubById = async (id) => {
  const club = await Club.findById(id).populate('createdBy', 'name email').lean();
  if (!club) {
    throw ApiError.notFound('Club not found');
  }

  const ClubManager = require('../models/ClubManager');
  const manager = await ClubManager.findOne({ clubId: id }).select('name email');
  if (manager) {
    club.manager = manager;
  }

  return club;
};

/**
 * Update a club.
 */
const updateClub = async (id, data, user, role) => {
  const club = await Club.findById(id);
  if (!club) throw ApiError.notFound('Club not found');
  checkClubAccess(club, user, role);

  // If slug is changed, check uniqueness
  if (data.slug && data.slug !== club.slug) {
    const existing = await Club.findOne({ slug: data.slug });
    if (existing) throw ApiError.conflict('Slug already taken');
  }

  Object.assign(club, data);
  await club.save();
  return club;
};

/**
 * Soft-delete (deactivate) a club.
 */
const deleteClub = async (id, user, role) => {
  const club = await Club.findById(id);
  if (!club) throw ApiError.notFound('Club not found');
  checkClubAccess(club, user, role);

  club.isActive = false;
  await club.save();
  return club;
};

/**
 * Update club theme.
 */
const updateTheme = async (id, themeData, user, role) => {
  const club = await Club.findById(id);
  if (!club) throw ApiError.notFound('Club not found');
  checkClubAccess(club, user, role);

  if (themeData.primaryColor) club.theme.primaryColor = themeData.primaryColor;
  if (themeData.secondaryColor) club.theme.secondaryColor = themeData.secondaryColor;
  if (themeData.bannerUrl !== undefined) club.theme.bannerUrl = themeData.bannerUrl;
  if (themeData.template) club.theme.template = themeData.template;

  await club.save();
  return club;
};

/**
 * Update club settings.
 */
const updateSettings = async (id, settingsData, user, role) => {
  const club = await Club.findById(id);
  if (!club) throw ApiError.notFound('Club not found');
  checkClubAccess(club, user, role);

  club.settings = { ...club.settings, ...settingsData };
  await club.save();
  return club;
};

/**
 * Update club logo.
 */
const updateLogo = async (id, logo, user, role) => {
  const club = await Club.findById(id);
  if (!club) throw ApiError.notFound('Club not found');
  checkClubAccess(club, user, role);

  club.logo = logo;
  await club.save();
  return club;
};

module.exports = {
  createClub,
  getAllClubs,
  getClubBySlug,
  getClubById,
  updateClub,
  deleteClub,
  updateTheme,
  updateSettings,
  updateLogo,
};
