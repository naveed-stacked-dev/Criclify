const Joi = require('joi');

const objectId = Joi.string().regex(/^[a-fA-F0-9]{24}$/).message('{{#label}} must be a valid ID');

const createPlayerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required()
    .messages({ 'any.required': 'Player name is required' }),
  role: Joi.string().valid('batsman', 'bowler', 'allrounder', 'wicketkeeper').required()
    .messages({ 'any.required': 'Player role is required', 'any.only': 'Role must be batsman, bowler, allrounder, or wicketkeeper' }),
  teamId: objectId.allow(null, '').optional(),
  clubId: objectId.required()
    .messages({ 'any.required': 'Club ID is required' }),
  jerseyNumber: Joi.string().allow(null, '').optional(),
  phone: Joi.string().allow(null, '').optional(),
  avatar: Joi.any().optional(),
  battingStyle: Joi.string().valid('right-hand', 'left-hand').default('right-hand'),
  bowlingStyle: Joi.string().allow(null, '').optional(),
});

const updatePlayerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  role: Joi.string().valid('batsman', 'bowler', 'allrounder', 'wicketkeeper').optional(),
  avatar: Joi.any().optional(),
  battingStyle: Joi.string().valid('right-hand', 'left-hand').optional(),
  bowlingStyle: Joi.string().allow(null, '').optional(),
  teamId: objectId.allow(null, '').optional(),
  jerseyNumber: Joi.string().allow(null, '').optional(),
  phone: Joi.string().allow(null, '').optional(),
}).min(1).messages({ 'object.min': 'At least one field must be provided to update' });

module.exports = {
  createPlayerSchema,
  updatePlayerSchema,
};
