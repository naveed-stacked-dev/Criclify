const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Player name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['batsman', 'bowler', 'allrounder', 'wicketkeeper'],
      required: [true, 'Player role is required'],
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
      index: true,
    },
    jerseyNumber: {
      type: String,
      default: null,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'Club ID is required'],
      index: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    battingStyle: {
      type: String,
      enum: ['right-hand', 'left-hand'],
      default: 'right-hand',
    },
    bowlingStyle: {
      type: String,
      default: null,
    },
    approved: {
      type: Boolean,
      default: true,
      index: true,
    },
    stats: {
      matches: { type: Number, default: 0 },
      totalRuns: { type: Number, default: 0 },
      totalBallsFaced: { type: Number, default: 0 },
      totalWickets: { type: Number, default: 0 },
      totalBallsBowled: { type: Number, default: 0 },
      totalRunsConceded: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      fifties: { type: Number, default: 0 },
      hundreds: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      dotBallsFaced: { type: Number, default: 0 },
      dotBallsBowled: { type: Number, default: 0 },
      catches: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

playerSchema.index({ clubId: 1, teamId: 1 });

module.exports = mongoose.model('Player', playerSchema);
