const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    teamA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    teamB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    squadA: {
      playingXI: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
      substitutes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
    },
    squadB: {
      playingXI: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
      substitutes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament ID is required'],
      index: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'Club ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['unscheduled', 'upcoming', 'live', 'completed', 'abandoned'],
      default: 'unscheduled',
    },
    toss: {
      wonBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      decision: { type: String, enum: ['bat', 'bowl'] },
    },
    currentInning: {
      type: Number,
      enum: [1, 2, 3, 4],
      default: 1,
    },
    battingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    bowlingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    venue: {
      type: String,
      default: null,
    },
    youtubeStreamUrl: {
      type: String,
      default: null,
    },
    rescheduleAction: {
      type: String,
      enum: ['prepone', 'postpone', null],
      default: null,
    },
    rescheduleReason: {
      type: String,
      default: null,
    },
    result: {
      winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      margin: { type: String },
      summary: { type: String },
    },
    tournamentMeta: {
      isKnockout: { type: Boolean, default: false },
      roundNumber: { type: Number, default: null },
      nextMatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
      // Which slot (A or B) the winner fills in the next match
      nextMatchSlot: { type: String, enum: ['A', 'B', null], default: null },
      // Free-form canvas position for the bracket builder UI
      positionX: { type: Number, default: null },
      positionY: { type: Number, default: null },
    },
    oversPerInning: {
      type: Number,
      default: 20,
    },
    matchLabel: {
      type: String,
      default: null,
    },
    matchNumber: {
      type: Number,
      default: null,
    },
    round: {
      type: Number,
      default: null,
    },
    // Position within the current round (0-indexed)
    matchOrder: {
      type: Number,
      default: null,
    },
    // Whether this match is an auto-advance BYE
    isBye: {
      type: Boolean,
      default: false,
    },
    // Whether this is the final match of the tournament
    isFinal: {
      type: Boolean,
      default: false,
    },
    // Whether this match went to a Super Over (tie breaker)
    superOver: {
      type: Boolean,
      default: false,
    },
    // Human-readable label: "QF1", "SF2", "Final"
    matchLabel: {
      type: String,
      default: null,
    },
    assignedManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatchManager',
      default: null,
    },
    scorerToken: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

matchSchema.index({ clubId: 1, status: 1 });
matchSchema.index({ tournamentId: 1, status: 1 });
matchSchema.index({ tournamentId: 1, round: 1, matchOrder: 1 });
matchSchema.index({ venue: 'text' });

module.exports = mongoose.model('Match', matchSchema);
