const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
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
    matchGroup: {
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

/** Build a URL-safe slug string from arbitrary text */
function toSlugPart(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Auto-generate slug before each save.
 * Pattern: <teamA-slug>-vs-<teamB-slug>[-m<matchNumber>]-<shortId>
 * Falls back to using the document's _id suffix so it's always unique.
 */
matchSchema.pre('save', async function (next) {
  // Only (re)generate when slug is missing or teams changed
  if (this.slug && !this.isModified('teamA') && !this.isModified('teamB') && !this.isModified('matchNumber')) {
    return next();
  }

  try {
    const Team = mongoose.model('Team');
    const shortId = this._id.toString().slice(-6);

    let teamAName = '';
    let teamBName = '';

    if (this.teamA) {
      const tA = await Team.findById(this.teamA).select('name').lean();
      if (tA) teamAName = toSlugPart(tA.name);
    }
    if (this.teamB) {
      const tB = await Team.findById(this.teamB).select('name').lean();
      if (tB) teamBName = toSlugPart(tB.name);
    }

    const parts = [];
    if (teamAName) parts.push(teamAName);
    parts.push('vs');
    if (teamBName) parts.push(teamBName);
    if (this.matchNumber != null) parts.push(`m${this.matchNumber}`);
    parts.push(shortId);

    this.slug = parts.join('-');
  } catch {
    // Fallback: just use short _id
    this.slug = this._id.toString().slice(-8);
  }

  next();
});

matchSchema.index({ clubId: 1, status: 1 });
matchSchema.index({ tournamentId: 1, status: 1 });
matchSchema.index({ tournamentId: 1, round: 1, matchOrder: 1 });
matchSchema.index({ venue: 'text' });

module.exports = mongoose.model('Match', matchSchema);
