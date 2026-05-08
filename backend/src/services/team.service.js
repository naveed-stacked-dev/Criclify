const Team = require('../models/Team');
const Player = require('../models/Player');
const ApiError = require('../utils/ApiError');

/**
 * Create a team within a club.
 */
const createTeam = async (data) => {
  const existing = await Team.findOne({ clubId: data.clubId, name: data.name });
  if (existing) {
    throw ApiError.conflict('A team with this name already exists in the club');
  }
  const team = await Team.create(data);
  return team;
};

/**
 * Get all teams in a club with pagination.
 */
const getTeamsByClub = async (clubId, { skip, limit }) => {
  const [teams, total] = await Promise.all([
    Team.find({ clubId }).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Team.countDocuments({ clubId }),
  ]);

  const teamsWithCount = await Promise.all(
    teams.map(async (team) => {
      const playerCount = await Player.countDocuments({ teamId: team._id });
      return { ...team, playerCount };
    })
  );

  return { teams: teamsWithCount, total };
};

/**
 * Get a single team by ID.
 */
const getTeamById = async (id) => {
  const team = await Team.findById(id).populate('clubId', 'name slug');
  if (!team) throw ApiError.notFound('Team not found');
  return team;
};

/**
 * Update a team.
 */
const updateTeam = async (id, data) => {
  const team = await Team.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!team) throw ApiError.notFound('Team not found');
  return team;
};

/**
 * Delete a team.
 */
const deleteTeam = async (id) => {
  const team = await Team.findByIdAndDelete(id);
  if (!team) throw ApiError.notFound('Team not found');
  return team;
};

/**
 * Add a player to the team.
 */
const addPlayerToTeam = async (teamId, playerId) => {
  const team = await Team.findById(teamId);
  if (!team) throw ApiError.notFound('Team not found');

  const player = await Player.findById(playerId);
  if (!player) throw ApiError.notFound('Player not found');

  if (player.clubId.toString() !== team.clubId.toString()) {
    throw ApiError.badRequest('Player and team must belong to the same club');
  }

  if (player.teamId && player.teamId.toString() === teamId.toString()) {
    throw ApiError.conflict('Player is already in this team');
  }

  player.teamId = teamId;
  await player.save();

  return player;
};

module.exports = {
  createTeam,
  getTeamsByClub,
  getTeamById,
  updateTeam,
  deleteTeam,
  addPlayerToTeam,
};
