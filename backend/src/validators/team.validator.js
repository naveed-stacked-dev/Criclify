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

const playerSubmitSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'any.required': 'Player name is required', 'string.min': 'Player name must be at least 2 characters' }),
  role: Joi.string().valid('batsman', 'bowler', 'allrounder', 'wicketkeeper').required()
    .messages({ 'any.required': 'Player role is required', 'any.only': 'Role must be batsman, bowler, allrounder or wicketkeeper' }),
  jerseyNumber: Joi.string().max(4).optional().allow('', null),
  phone: Joi.string().pattern(/^[\d+]{7,15}$/).optional().allow('', null)
    .messages({ 'string.pattern.base': 'Phone must be 7-15 digits' }),
  battingStyle: Joi.string().valid('right-hand', 'left-hand').optional().allow('', null),
  bowlingStyle: Joi.string().optional().allow('', null),
});

const publicSubmitTeamSchema = Joi.object({
  clubId: objectId.required()
    .messages({ 'any.required': 'Club ID is required' }),
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'any.required': 'Team name is required', 'string.min': 'Team name must be at least 2 characters' }),
  players: Joi.array()
    .min(12)
    .max(35)
    .items(playerSubmitSchema)
    .required()
    .messages({
      'any.required': 'Players list is required',
      'array.min': 'At least 12 players are required',
      'array.max': 'Maximum 35 players allowed',
    }),
});

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  addPlayerSchema,
  publicSubmitTeamSchema,
};
