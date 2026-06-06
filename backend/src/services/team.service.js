const Team = require('../models/Team');
const Player = require('../models/Player');
const PlayerStatsCache = require('../models/PlayerStatsCache');
const ApiError = require('../utils/ApiError');

const createTeam = async (data) => {
  const existing = await Team.findOne({ clubId: data.clubId, name: data.name });
  if (existing) throw ApiError.conflict('A team with this name already exists in the club');
  const team = await Team.create(data); // approved defaults to true (admin-created)
  return team;
};

/**
 * Get teams for a club. approvedFilter: true = approved only, false = pending only, null = all.
 */
const getTeamsByClub = async (clubId, { skip, limit }, approvedFilter = null) => {
  const filter = { clubId };
  if (approvedFilter === true) {
    // Match approved:true OR documents that predate the field (no approved field yet)
    filter.approved = { $ne: false };
  } else if (approvedFilter === false) {
    filter.approved = false;
  }

  const [teams, total] = await Promise.all([
    Team.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Team.countDocuments(filter),
  ]);

  const teamsWithCount = await Promise.all(
    teams.map(async (team) => {
      const playerCount = await Player.countDocuments({ teamId: team._id });
      return { ...team, playerCount };
    })
  );

  return { teams: teamsWithCount, total };
};

const getTeamById = async (id) => {
  const team = await Team.findById(id).populate('clubId', 'name slug');
  if (!team) throw ApiError.notFound('Team not found');
  return team;
};

const updateTeam = async (id, data) => {
  const team = await Team.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!team) throw ApiError.notFound('Team not found');
  return team;
};

const deleteTeam = async (id) => {
  const team = await Team.findByIdAndDelete(id);
  if (!team) throw ApiError.notFound('Team not found');
  return team;
};

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

/**
 * Public team registration — creates team with approved:false and bulk-inserts players.
 * Image URLs (team logo, player avatars) are uploaded to S3 by the controller beforehand.
 */
const submitTeamPublic = async ({ clubId, name, logo, players }) => {
  if (!players || players.length < 12) throw ApiError.badRequest('Minimum 12 players are required');
  if (players.length > 35) throw ApiError.badRequest('Maximum 35 players allowed');

  const existing = await Team.findOne({ clubId, name });
  if (existing) throw ApiError.conflict('A team with this name already exists in this club');

  const team = await Team.create({
    clubId,
    name,
    logo: logo || null,
    approved: false,
  });

  const playerDocs = players.map((p) => ({
    name: p.name,
    role: p.role,
    jerseyNumber: p.jerseyNumber || null,
    phone: p.phone || null,
    battingStyle: p.battingStyle || 'right-hand',
    bowlingStyle: p.bowlingStyle || null,
    avatar: p.avatar || null,
    clubId,
    teamId: team._id,
    approved: false,
  }));

  const createdPlayers = await Player.insertMany(playerDocs);

  await PlayerStatsCache.insertMany(
    createdPlayers.map((p) => ({ playerId: p._id, clubId }))
  );

  return { team, playerCount: createdPlayers.length };
};

const approveTeam = async (id) => {
  const team = await Team.findByIdAndUpdate(id, { approved: true }, { new: true });
  if (!team) throw ApiError.notFound('Team not found');
  await Player.updateMany({ teamId: team._id }, { $set: { approved: true } });
  return team;
};

module.exports = {
  createTeam,
  getTeamsByClub,
  getTeamById,
  updateTeam,
  deleteTeam,
  addPlayerToTeam,
  submitTeamPublic,
  approveTeam,
};
