const Joi = require('joi');

const objectId = Joi.string().regex(/^[a-fA-F0-9]{24}$/).message('{{#label}} must be a valid ID');

// ─── SuperAdmin ──────────────────────────────────────────────────
const registerSuperAdminSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'any.required': 'Name is required', 'string.min': 'Name must be at least 2 characters' }),
  email: Joi.string().trim().lowercase().email().required()
    .messages({ 'any.required': 'Email is required', 'string.email': 'Please enter a valid email address' }),
  password: Joi.string().min(6).max(128).required()
    .messages({ 'any.required': 'Password is required', 'string.min': 'Password must be at least 6 characters' }),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required()
    .messages({ 'any.required': 'Email is required', 'string.email': 'Please enter a valid email address' }),
  password: Joi.string().required()
    .messages({ 'any.required': 'Password is required' }),
});

const matchManagerLoginSchema = Joi.object({
  name: Joi.string().trim().required().messages({ 'any.required': 'Name is required' }),
  password: Joi.string().required().messages({ 'any.required': 'Password is required' }),
  token: Joi.string().uuid().allow(null, '').optional(),
});

// ─── ClubManager ─────────────────────────────────────────────────
const registerClubManagerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'any.required': 'Name is required' }),
  email: Joi.string().trim().lowercase().email().required()
    .messages({ 'any.required': 'Email is required', 'string.email': 'Please enter a valid email address' }),
  password: Joi.string().min(6).max(128).required()
    .messages({ 'any.required': 'Password is required', 'string.min': 'Password must be at least 6 characters' }),
  clubId: objectId.required()
    .messages({ 'any.required': 'Club ID is required' }),
});

// ─── MatchManager ────────────────────────────────────────────────
const createMatchManagerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'any.required': 'Name is required' }),
  password: Joi.string().min(6).max(128).required()
    .messages({ 'any.required': 'Password is required' }),
  matchId: objectId.optional(),
  clubId: objectId.required()
    .messages({ 'any.required': 'Club ID is required' }),
  accessType: Joi.string().valid('login', 'token').default('token'),
});

// ─── User ────────────────────────────────────────────────────────
const registerUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'any.required': 'Name is required' }),
  email: Joi.string().trim().lowercase().email().required()
    .messages({ 'any.required': 'Email is required', 'string.email': 'Please enter a valid email address' }),
  password: Joi.string().min(6).max(128).pattern(/^(?=.*[a-zA-Z])(?=.*[0-9])/).required()
    .messages({ 
      'any.required': 'Password is required', 
      'string.min': 'Password must be at least 6 characters',
      'string.pattern.base': 'Password must be alphanumeric (contain at least one letter and one number)'
    }),
});

// ─── Token ───────────────────────────────────────────────────────
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
    .messages({ 'any.required': 'Refresh token is required' }),
});

// ─── Password Reset ──────────────────────────────────────────────
const resetPasswordSchema = Joi.object({
  managerId: objectId.required()
    .messages({ 'any.required': 'Manager ID is required' }),
  newPassword: Joi.string().min(6).max(128).required()
    .messages({ 'any.required': 'New password is required', 'string.min': 'Password must be at least 6 characters' }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required()
    .messages({ 'any.required': 'Current password is required' }),
  newPassword: Joi.string().min(6).max(128).required()
    .messages({ 'any.required': 'New password is required', 'string.min': 'New password must be at least 6 characters' }),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    .messages({ 'any.required': 'Please confirm your new password', 'any.only': 'Passwords do not match' }),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional()
    .messages({ 'string.min': 'Name must be at least 2 characters' }),
  email: Joi.string().trim().lowercase().email().optional()
    .messages({ 'string.email': 'Please enter a valid email address' }),
});

module.exports = {
  registerSuperAdminSchema,
  loginSchema,
  matchManagerLoginSchema,
  registerClubManagerSchema,
  createMatchManagerSchema,
  registerUserSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
};
