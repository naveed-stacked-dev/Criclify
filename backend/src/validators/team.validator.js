const Joi = require('joi');

const objectId = Joi.string().regex(/^[a-fA-F0-9]{24}$/).message('{{#label}} must be a valid ID');

const createTeamSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'any.required': 'Team name is required', 'string.min': 'Team name must be at least 2 characters' }),
  shortName: Joi.string().trim().max(5).uppercase().optional()
    .messages({ 'string.max': 'Short name cannot exceed 5 characters' }),
  logo: Joi.any().optional(),
  color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
    .messages({ 'string.pattern.base': 'Color must be a valid hex color' }),
  clubId: objectId.required()
    .messages({ 'any.required': 'Club ID is required' }),
  captain: objectId.optional(),
});

const updateTeamSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  shortName: Joi.string().trim().max(5).uppercase().optional(),
  logo: Joi.any().optional(),
  color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  captain: objectId.allow(null).optional(),
}).min(1).messages({ 'object.min': 'At least one field must be provided to update' });

const addPlayerSchema = Joi.object({
  playerId: objectId.required()
    .messages({ 'any.required': 'Player ID is required' }),
});

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  addPlayerSchema,
};
