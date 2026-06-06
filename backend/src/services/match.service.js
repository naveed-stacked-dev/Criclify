const Match = require('../models/Match');
const ApiError = require('../utils/ApiError');
const { validateAndNormalizeYoutubeUrl } = require('../utils/youtube');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

/**
 * Get matches with filters and pagination.
 */
const getMatches = async (filter, { skip, limit }) => {
  const [matches, total] = await Promise.all([
    Match.find(filter)
      .sort({ startTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('teamA', 'name logo')
      .populate('teamB', 'name logo')
      .populate('tournamentId', 'name type')
      .populate('assignedManager', 'name email'),
    Match.countDocuments(filter),
  ]);
  return { matches, total };
};

/**
 * Get a single match by ID or slug.
 */
const getMatchById = async (idOrSlug) => {
  const mongoose = require('mongoose');
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24;

  const query = isObjectId
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  const match = await Match.findOne(query)
    .populate('teamA', 'name logo')
    .populate('teamB', 'name logo')
    .populate('tournamentId', 'name type')
    .populate('clubId', 'theme')
    .populate('toss.wonBy', 'name')
    .populate('battingTeam', 'name')
    .populate('bowlingTeam', 'name')
    .populate('result.winner', 'name')
    .populate('squadA.playingXI', 'name')
    .populate('squadA.substitutes', 'name')
    .populate('squadB.playingXI', 'name')
    .populate('squadB.substitutes', 'name');
  if (!match) throw ApiError.notFound('Match not found');
  return match;
};

/**
 * Update match details (schedule, venue, youtube URL, etc.).
 */
const updateMatch = async (id, data) => {
  // Validate YouTube URL if provided
  if (data.youtubeStreamUrl) {
    const { isValid, embedUrl } = validateAndNormalizeYoutubeUrl(data.youtubeStreamUrl);
    if (!isValid) {
      throw ApiError.badRequest('Invalid YouTube URL');
    }
    data.youtubeStreamUrl = embedUrl;
  }

  const existingMatch = await Match.findById(id);
  if (!existingMatch) throw ApiError.notFound('Match not found');

  // If setting a start time for an unscheduled match, make it upcoming
  if (data.startTime && existingMatch.status === 'unscheduled' && !data.status) {
    data.status = 'upcoming';
  }

  const match = await Match.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })
    .populate('teamA', 'name logo')
    .populate('teamB', 'name logo');
  if (!match) throw ApiError.notFound('Match not found');
  return match;
};

/**
 * Get live matches for a club.
 */
const getLiveMatches = async (clubId) => {
  const matches = await Match.find({ clubId, status: 'live' })
    .populate('teamA', 'name logo')
    .populate('teamB', 'name logo')
    .populate('tournamentId', 'name');
  return matches;
};

/**
 * Get matches by tournament.
 */
const getMatchesByTournament = async (tournamentId, { skip, limit }) => {
  const [matches, total] = await Promise.all([
    Match.find({ tournamentId })
      .sort({ round: 1, matchNumber: 1 })
      .skip(skip)
      .limit(limit)
      .populate('teamA', 'name logo')
      .populate('teamB', 'name logo')
      .populate('assignedManager', 'name email'),
    Match.countDocuments({ tournamentId }),
  ]);
  return { matches, total };
};

const createMatch = async (data) => {
  if (data.startTime) {
    data.status = 'upcoming';
  }
  const match = await Match.create(data);
  return match;
};

const deleteMatch = async (id) => {
  const match = await Match.findByIdAndDelete(id);
  if (!match) throw ApiError.notFound('Match not found');
  return match;
};

const scheduleMatch = async (id, scheduleData) => {
  const match = await Match.findById(id);
  if (!match) throw ApiError.notFound('Match not found');

  match.startTime = scheduleData.startTime;
  if (scheduleData.venue !== undefined) {
    match.venue = scheduleData.venue;
  }
  
  if (scheduleData.action) {
    match.rescheduleAction = scheduleData.action;
    match.rescheduleReason = scheduleData.reason;
  }

  // If the match was live or completed, and we are rescheduling, we set it back to upcoming.
  // The summary will naturally be preserved.
  if (match.status !== 'completed' || scheduleData.action) {
    match.status = 'upcoming';
  }

  await match.save();
  return match;
};

const assignManager = async (matchId, managerId) => {
  const match = await Match.findByIdAndUpdate(
    matchId,
    { assignedManager: managerId },
    { new: true }
  );
  if (!match) throw ApiError.notFound('Match not found');
  return match;
};

const generateScorerToken = async (matchId) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  const token = uuidv4();
  match.scorerToken = token;
  await match.save();
  
  // Create a pseudo client URL if not defined
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return { token, link: `${clientUrl}/scorer/access?token=${token}` };
};

const getScorerLink = async (matchId) => {
  const match = await Match.findById(matchId);
  if (!match) throw ApiError.notFound('Match not found');
  if (!match.scorerToken) {
    return generateScorerToken(matchId);
  }
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  return { token: match.scorerToken, link: `${clientUrl}/scorer/access?token=${match.scorerToken}` };
};

const updateStreamUrl = async (id, url) => {
  const { isValid, embedUrl } = validateAndNormalizeYoutubeUrl(url);
  if (!isValid) throw ApiError.badRequest('Invalid YouTube URL');

  const match = await Match.findByIdAndUpdate(
    id,
    { youtubeStreamUrl: embedUrl },
    { new: true }
  );
  if (!match) throw ApiError.notFound('Match not found');
  return match;
};

const getStreamUrl = async (id) => {
  const match = await Match.findById(id);
  if (!match) throw ApiError.notFound('Match not found');
  return { streamUrl: match.youtubeStreamUrl };
};

module.exports = {
  getMatches,
  getMatchById,
  updateMatch,
  getLiveMatches,
  getMatchesByTournament,
  createMatch,
  deleteMatch,
  scheduleMatch,
  assignManager,
  generateScorerToken,
  getScorerLink,
  updateStreamUrl,
  getStreamUrl,
};
