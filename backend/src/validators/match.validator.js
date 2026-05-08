const Joi = require('joi');

const objectId = Joi.string().regex(/^[a-fA-F0-9]{24}$/).message('{{#label}} must be a valid ID');

// ─── Match CRUD ──────────────────────────────────────────────────
const createMatchSchema = Joi.object({
  teamA: objectId.optional(),
  teamB: objectId.optional(),
  tournamentId: objectId.required().messages({ 'any.required': 'Tournament ID is required' }),
  clubId: objectId.required().messages({ 'any.required': 'Club ID is required' }),
  venue: Joi.string().trim().max(200).allow(null, '').optional(),
  startTime: Joi.date().iso().allow(null).optional(),
  oversPerInning: Joi.number().integer().min(1).max(50).default(20),
  matchNumber: Joi.number().integer().optional(),
  round: Joi.number().integer().optional(),
  matchLabel: Joi.string().trim().max(50).allow(null, '').optional(),
});

const updateMatchSchema = Joi.object({
  venue: Joi.string().trim().max(200).allow(null, '').optional(),
  startTime: Joi.date().iso().allow(null).optional(),
  youtubeStreamUrl: Joi.string().uri().allow(null, '').optional(),
  oversPerInning: Joi.number().integer().min(1).max(50).optional(),
  matchNumber: Joi.number().integer().optional(),
  round: Joi.number().integer().optional(),
  matchLabel: Joi.string().trim().max(50).allow(null, '').optional(),
  status: Joi.string().valid('unscheduled', 'upcoming', 'live', 'completed', 'abandoned').optional(),
  squadA: Joi.object({
    playingXI: Joi.array().items(objectId).optional(),
    substitutes: Joi.array().items(objectId).optional()
  }).optional(),
  squadB: Joi.object({
    playingXI: Joi.array().items(objectId).optional(),
    substitutes: Joi.array().items(objectId).optional()
  }).optional(),
}).min(1).messages({ 'object.min': 'At least one field must be provided to update' });

const scheduleMatchSchema = Joi.object({
  startTime: Joi.date().iso().required()
    .messages({ 'any.required': 'Start time is required', 'date.format': 'Please provide a valid date and time' }),
  venue: Joi.string().trim().max(200).allow(null, '').optional(),
  action: Joi.string().valid('prepone', 'postpone').allow(null, '').optional(),
  reason: Joi.string().trim().max(500).allow(null, '').optional(),
});

// ─── Scoring ─────────────────────────────────────────────────────
const startMatchSchema = Joi.object({
  wonBy: objectId.required()
    .messages({ 'any.required': 'Toss winner team is required' }),
  decision: Joi.string().valid('bat', 'bowl').required()
    .messages({ 'any.required': 'Toss decision is required', 'any.only': 'Decision must be bat or bowl' }),
});

const addScoreSchema = Joi.object({
  batsmanId: objectId.required().messages({ 'any.required': 'Batsman is required' }),
  bowlerId: objectId.required().messages({ 'any.required': 'Bowler is required' }),
  runs: Joi.number().integer().min(0).max(7).required()
    .messages({ 'any.required': 'Runs are required', 'number.max': 'Runs cannot exceed 7 per ball' }),
});

const addWicketSchema = Joi.object({
  batsmanId: objectId.required().messages({ 'any.required': 'Batsman is required' }),
  bowlerId: objectId.required().messages({ 'any.required': 'Bowler is required' }),
  wicketType: Joi.string().valid('bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'retired').required()
    .messages({ 'any.required': 'Wicket type is required', 'any.only': 'Invalid wicket type' }),
  outPlayerId: objectId.optional(),
  fielderId: objectId.optional(),
  runs: Joi.number().integer().min(0).default(0),
  isLegalDelivery: Joi.boolean().default(true),
});

const addExtraSchema = Joi.object({
  batsmanId: objectId.required().messages({ 'any.required': 'Batsman is required' }),
  bowlerId: objectId.required().messages({ 'any.required': 'Bowler is required' }),
  extraType: Joi.string().valid('wide', 'noball', 'bye', 'legbye', 'penalty').required()
    .messages({ 'any.required': 'Extra type is required', 'any.only': 'Invalid extra type' }),
  extraRuns: Joi.number().integer().min(1).default(1),
  runs: Joi.number().integer().min(0).default(0),
});

const endMatchSchema = Joi.object({
  winner: objectId.allow(null).optional(),
  margin: Joi.string().trim().max(100).allow('').optional(),
  summary: Joi.string().trim().max(500).allow('').optional(),
});

const setActivePlayersSchema = Joi.object({
  striker: objectId.optional(),
  nonStriker: objectId.optional(),
  bowler: objectId.optional(),
}).min(1).messages({ 'object.min': 'At least one player must be specified' });

const pauseMatchSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow(null, '').optional(),
  newStartTime: Joi.date().iso().allow(null, '').optional()
    .messages({ 'date.format': 'Please provide a valid date and time for rescheduling' }),
});

// ─── Streaming ───────────────────────────────────────────────────
const streamUrlSchema = Joi.object({
  youtubeStreamUrl: Joi.string().trim().required()
    .messages({ 'any.required': 'YouTube stream URL is required' }),
});

// ─── Manager Assignment ──────────────────────────────────────────
const assignManagerSchema = Joi.object({
  managerId: objectId.required()
    .messages({ 'any.required': 'Manager ID is required' }),
});

module.exports = {
  createMatchSchema,
  updateMatchSchema,
  scheduleMatchSchema,
  startMatchSchema,
  addScoreSchema,
  addWicketSchema,
  addExtraSchema,
  endMatchSchema,
  setActivePlayersSchema,
  pauseMatchSchema,
  streamUrlSchema,
  assignManagerSchema,
};
