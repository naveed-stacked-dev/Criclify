const Joi = require('joi');

const objectId = Joi.string().regex(/^[a-fA-F0-9]{24}$/).message('{{#label}} must be a valid ID');

const nameField = (required = true) => {
  const base = Joi.string().trim().min(2).max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'string.pattern.base': 'Name must contain only letters, spaces, hyphens or apostrophes',
      'string.min': 'Name must be at least 2 characters',
    });
  return required ? base.required().messages({ 'any.required': 'Player name is required' }) : base.optional();
};

const phoneField = () =>
  Joi.string().trim().pattern(/^\+?[0-9]{7,15}$/).allow(null, '').optional()
    .messages({ 'string.pattern.base': 'Phone number must contain only digits (7–15 digits, optional leading +)' });

const createPlayerSchema = Joi.object({
  name: nameField(true),
  role: Joi.string().valid('batsman', 'bowler', 'allrounder', 'wicketkeeper').required()
    .messages({ 'any.required': 'Player role is required', 'any.only': 'Role must be batsman, bowler, allrounder, or wicketkeeper' }),
  teamId: objectId.allow(null, '').optional(),
  clubId: objectId.required()
    .messages({ 'any.required': 'Club ID is required' }),
  jerseyNumber: Joi.string().allow(null, '').optional(),
  phone: phoneField(),
  avatar: Joi.any().optional(),
  battingStyle: Joi.string().valid('right-hand', 'left-hand').default('right-hand'),
  bowlingStyle: Joi.string().allow(null, '').optional(),
});

const updatePlayerSchema = Joi.object({
  name: nameField(false),
  role: Joi.string().valid('batsman', 'bowler', 'allrounder', 'wicketkeeper').optional(),
  avatar: Joi.any().optional(),
  battingStyle: Joi.string().valid('right-hand', 'left-hand').optional(),
  bowlingStyle: Joi.string().allow(null, '').optional(),
  teamId: objectId.allow(null, '').optional(),
  jerseyNumber: Joi.string().allow(null, '').optional(),
  phone: phoneField(),
}).min(1).messages({ 'object.min': 'At least one field must be provided to update' });

module.exports = {
  createPlayerSchema,
  updatePlayerSchema,
};
