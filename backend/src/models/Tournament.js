const mongoose = require('mongoose');

const pointsEntrySchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    noResult: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    nrr: { type: Number, default: 0 },
    runsScored: { type: Number, default: 0 },
    oversFaced: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    oversBowled: { type: Number, default: 0 },
  },
  { _id: false }
);

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['league', 'knockout'],
      required: [true, 'Tournament type is required'],
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
    matches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match',
      },
    ],
    pointsTable: [pointsEntrySchema],
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'Club ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
    },
    season: {
      type: String,
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    settings: {
      oversPerInning: {
        type: Number,
        default: 20,
      },
      pointsPerWin: { type: Number, default: 2 },
      pointsPerTie: { type: Number, default: 1 },
      pointsPerLoss: { type: Number, default: 0 },
    },
    groups: [
      {
        name: { type: String, trim: true }, // 'A', 'B', 'C', 'D', 'E'
        teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tournament', tournamentSchema);
