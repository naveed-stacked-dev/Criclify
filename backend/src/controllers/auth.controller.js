const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');

/**
 * Register SuperAdmin
 */
const registerSuperAdmin = async (req, res, next) => {
  try {
    const result = await authService.register(ROLES.SUPER_ADMIN, req.body);
    res.status(201).json(ApiResponse.created(result, 'SuperAdmin registered successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Login SuperAdmin
 */
const loginSuperAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(ROLES.SUPER_ADMIN, email, password);
    res.json(ApiResponse.ok(result, 'Login successful'));
  } catch (error) {
    next(error);
  }
};

/**
 * Register ClubManager
 */
const registerClubManager = async (req, res, next) => {
  try {
    const result = await authService.register(ROLES.CLUB_MANAGER, req.body);
    res.status(201).json(ApiResponse.created(result, 'ClubManager registered successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Login ClubManager
 */
const loginClubManager = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(ROLES.CLUB_MANAGER, email, password);
    res.json(ApiResponse.ok(result, 'Login successful'));
  } catch (error) {
    next(error);
  }
};

/**
 * Create MatchManager (with auto-generated token)
 */
const createMatchManager = async (req, res, next) => {
  try {
    const manager = await authService.createMatchManager(req.body);
    res.status(201).json(ApiResponse.created(manager, 'MatchManager created with access token'));
  } catch (error) {
    next(error);
  }
};

// Removed loginMatchManagerByToken

/**
 * Login MatchManager via email/password
 */
const loginMatchManager = async (req, res, next) => {
  try {
    const { name, password, token } = req.body;
    const result = await authService.loginMatchManager(name, password, token);
    res.json(ApiResponse.ok(result, 'Login successful'));
  } catch (error) {
    next(error);
  }
};

/**
 * Register public User
 */
const registerUser = async (req, res, next) => {
  try {
    const result = await authService.register(ROLES.USER, req.body);
    res.status(201).json(ApiResponse.created(result, 'User registered successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Login public User
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(ROLES.USER, email, password);
    res.json(ApiResponse.ok(result, 'Login successful'));
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshAccessToken(refreshToken);
    res.json(ApiResponse.ok(tokens, 'Token refreshed'));
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 */
const getMe = async (req, res, next) => {
  try {
    const userObj = req.user.toObject();
    userObj.role = req.userRole;
    res.json(
      ApiResponse.ok({ user: userObj }, 'Profile fetched')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Reset ClubManager Password (SuperAdmin only)
 */
const resetClubManagerPassword = async (req, res, next) => {
  try {
    const { managerId, newPassword } = req.body;
    await authService.resetClubManagerPassword(managerId, newPassword);
    res.json(ApiResponse.ok(null, 'Manager password reset successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Change Own Password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.userRole, req.user._id, currentPassword, newPassword);
    res.json(ApiResponse.ok(null, 'Password changed successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Update Profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const result = await authService.updateProfile(req.userRole, req.user._id, req.body);
    res.json(ApiResponse.ok(result, 'Profile updated successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerSuperAdmin,
  loginSuperAdmin,
  registerClubManager,
  loginClubManager,
  createMatchManager,
  loginMatchManager,
  registerUser,
  loginUser,
  refreshToken,
  getMe,
  resetClubManagerPassword,
  changePassword,
  updateProfile,
};
