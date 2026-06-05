const Joi = require('joi');

const objectId = Joi.string().regex(/^[a-fA-F0-9]{24}$/).message('{{#label}} must be a valid ID');

const createClubSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'any.required': 'Club name is required', 'string.min': 'Club name must be at least 2 characters' }),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional()
    .messages({ 'string.pattern.base': 'Slug must only contain lowercase letters, numbers, and hyphens' }),
  logo: Joi.any().optional(),
  bannerUrl: Joi.any().optional(),
  themeColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  description: Joi.string().trim().max(500).allow('').optional(),
  settings: Joi.object({
    oversPerInning: Joi.number().integer().min(1).max(50).default(20),
    maxPlayersPerTeam: Joi.number().integer().min(2).max(30).default(15),
    maxTeams: Joi.number().integer().min(2).max(64).default(16),
    wideReBall: Joi.boolean().default(true),
    noBallReBall: Joi.boolean().default(true),
  }).optional(),
});

const updateClubSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional()
    .messages({ 'string.pattern.base': 'Slug must only contain lowercase letters, numbers, and hyphens' }),
  logo: Joi.any().optional(),
  bannerUrl: Joi.any().optional(),
  themeColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  description: Joi.string().trim().max(500).allow('').optional(),
  isActive: Joi.boolean().optional(),
  settings: Joi.object({
    oversPerInning: Joi.number().integer().min(1).max(50).optional(),
    maxPlayersPerTeam: Joi.number().integer().min(2).max(30).optional(),
    maxTeams: Joi.number().integer().min(2).max(64).optional(),
    wideReBall: Joi.boolean().optional(),
    noBallReBall: Joi.boolean().optional(),
  }).optional(),
}).min(1).messages({ 'object.min': 'At least one field must be provided to update' });

const updateThemeSchema = Joi.object({
  primaryColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
    .messages({ 'string.pattern.base': 'Primary color must be a valid hex color (e.g. #FF5733)' }),
  secondaryColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
    .messages({ 'string.pattern.base': 'Secondary color must be a valid hex color' }),
  bannerUrl: Joi.string().uri().allow(null, '').optional(),
  template: Joi.string().valid('classic', 'cricket-ball', 'stadium', 'pitch-lines', 'trophy-gold').optional(),
}).min(1).messages({ 'object.min': 'At least one theme field is required' });

const updateSettingsSchema = Joi.object({
  oversPerInning: Joi.number().integer().min(1).max(50).optional()
    .messages({ 'number.min': 'Overs per inning must be at least 1', 'number.max': 'Overs per inning cannot exceed 50' }),
  maxPlayersPerTeam: Joi.number().integer().min(2).max(30).optional(),
  maxTeams: Joi.number().integer().min(2).max(64).optional(),
  wideReBall: Joi.boolean().optional(),
  noBallReBall: Joi.boolean().optional(),
}).min(1).messages({ 'object.min': 'At least one setting is required' });

const updateLogoSchema = Joi.object({
  logo: Joi.string().uri().required()
    .messages({ 'any.required': 'Logo URL is required', 'string.uri': 'Please provide a valid URL for the logo' }),
});

module.exports = {
  createClubSchema,
  updateClubSchema,
  updateThemeSchema,
  updateSettingsSchema,
  updateLogoSchema,
};
