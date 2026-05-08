const mongoose = require('mongoose');

const inningsSummarySchema = new mongoose.Schema(
  {
    battingTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    bowlingTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    score: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    extras: {
      wides: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 },
      byes: { type: Number, default: 0 },
      legByes: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    runRate: { type: Number, default: 0 },
    battingOrder: [
      {
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
        runs: { type: Number, default: 0 },
        balls: { type: Number, default: 0 },
        fours: { type: Number, default: 0 },
        sixes: { type: Number, default: 0 },
        isOut: { type: Boolean, default: false },
        dismissalType: { type: String, default: null },
      },
    ],
    bowlingFigures: [
      {
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
        overs: { type: Number, default: 0 },
        balls: { type: Number, default: 0 },
        maidens: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        economy: { type: Number, default: 0 },
      },
    ],
  },
  { _id: false }
);

const matchSummarySchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
      unique: true,
      index: true,
    },
    innings: {
      first: inningsSummarySchema,
      second: inningsSummarySchema,
      superOverFirst: inningsSummarySchema,
      superOverSecond: inningsSummarySchema,
    },
    currentInning: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 1,
    },
    currentBatsmen: {
      striker: {
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
        runs: { type: Number, default: 0 },
        balls: { type: Number, default: 0 },
        fours: { type: Number, default: 0 },
        sixes: { type: Number, default: 0 },
      },
      nonStriker: {
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
        runs: { type: Number, default: 0 },
        balls: { type: Number, default: 0 },
        fours: { type: Number, default: 0 },
        sixes: { type: Number, default: 0 },
      },
    },
    currentBowler: {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      overs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
    },
    lastEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatchEvent',
    },
    target: {
      type: Number,
      default: null,
    },
    requiredRunRate: {
      type: Number,
      default: null,
    },
    // Super over overs count (set when match is tied)
    superOverOvers: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['not_started', 'live', 'innings_break', 'completed'],
      default: 'not_started',
    },
    substitutions: [
      {
        substitutedIn: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
        substitutedOut: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
        reason: { type: String, default: 'Injury' },
        inning: { type: Number },
        timestamp: { type: Date, default: Date.now }
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('MatchSummary', matchSummarySchema);
