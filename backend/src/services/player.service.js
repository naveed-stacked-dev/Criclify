const Player = require('../models/Player');
const PlayerStatsCache = require('../models/PlayerStatsCache');
const MatchEvent = require('../models/MatchEvent');
const Match = require('../models/Match');
const ApiError = require('../utils/ApiError');

const TEAM_ROSTER_LIMIT = 35;

/**
 * Create a player within a club/team.
 */
const createPlayer = async (data) => {
  if (data.teamId) {
    const count = await Player.countDocuments({ teamId: data.teamId });
    if (count >= TEAM_ROSTER_LIMIT) {
      throw ApiError.badRequest(`Team roster is full. Maximum ${TEAM_ROSTER_LIMIT} players allowed per team.`);
    }
  }

  const player = await Player.create(data);

  // Initialize stats cache
  await PlayerStatsCache.create({
    playerId: player._id,
    clubId: data.clubId,
  });

  return player;
};

/**
 * Get all players in a club with pagination, optional team filter.
 */
const getPlayersByClub = async (clubId, { skip, limit }, teamId = null) => {
  const filter = { clubId };
  if (teamId) filter.teamId = teamId;

  const [players, total] = await Promise.all([
    Player.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate('teamId', 'name logo'),
    Player.countDocuments(filter),
  ]);

  return { players, total };
};

/**
 * Get a single player by ID with stats.
 */
const getPlayerById = async (id) => {
  const player = await Player.findById(id)
    .populate('teamId', 'name logo')
    .populate('clubId', 'name slug');
  if (!player) throw ApiError.notFound('Player not found');

  const stats = await PlayerStatsCache.findOne({ playerId: id });

  return { player, stats };
};

/**
 * Update a player. Checks roster limit if team is being assigned.
 */
const updatePlayer = async (id, data) => {
  if (data.teamId) {
    const existing = await Player.findById(id).select('teamId');
    const isNewTeam = !existing?.teamId || existing.teamId.toString() !== data.teamId.toString();
    if (isNewTeam) {
      const count = await Player.countDocuments({ teamId: data.teamId, _id: { $ne: id } });
      if (count >= TEAM_ROSTER_LIMIT) {
        throw ApiError.badRequest(`Team roster is full. Maximum ${TEAM_ROSTER_LIMIT} players allowed per team.`);
      }
    }
  }

  const player = await Player.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!player) throw ApiError.notFound('Player not found');
  return player;
};

/**
 * Delete a player and their stats cache.
 */
const deletePlayer = async (id) => {
  const player = await Player.findByIdAndDelete(id);
  if (!player) throw ApiError.notFound('Player not found');

  await PlayerStatsCache.deleteOne({ playerId: id });

  return player;
};

/**
 * Get players by team.
 */
const getPlayersByTeam = async (teamId) => {
  const players = await Player.find({ teamId }).sort({ name: 1 });
  return players;
};

/**
 * Get player's recent matches.
 */
const getPlayerRecentMatches = async (playerId, limit = 5) => {
  const matchIds = await MatchEvent.distinct('matchId', {
    $or: [{ batsmanId: playerId }, { bowlerId: playerId }, { fielderId: playerId }]
  });

  const matches = await Match.find({ _id: { $in: matchIds }, status: 'completed' })
    .sort({ endTime: -1 })
    .limit(limit)
    .populate('teamA', 'name logo')
    .populate('teamB', 'name logo');

  return matches;
};

module.exports = {
  createPlayer,
  getPlayersByClub,
  getPlayerById,
  updatePlayer,
  deletePlayer,
  getPlayersByTeam,
  getPlayerRecentMatches,
};

