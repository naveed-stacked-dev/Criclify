const mongoose = require('mongoose');

const playerStatsCacheSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
      index: true,
    },
    // Batting stats
    totalRuns: { type: Number, default: 0 },
    totalBallsFaced: { type: Number, default: 0 },
    totalInnings: { type: Number, default: 0 },
    notOuts: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    dotBallsFaced: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    hundreds: { type: Number, default: 0 },
    battingAverage: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    boundaryPercentage: { type: Number, default: 0 },
    dotBallPercentage: { type: Number, default: 0 },

    // Bowling stats
    totalWickets: { type: Number, default: 0 },
    totalBallsBowled: { type: Number, default: 0 },
    totalRunsConceded: { type: Number, default: 0 },
    totalOversBowled: { type: Number, default: 0 },
    bowlingAverage: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    bowlingStrikeRate: { type: Number, default: 0 },
    bestBowling: { type: String, default: '0/0' },
    dotBallsBowled: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },

    // Bowling milestones
    fourWicketHauls: { type: Number, default: 0 },
    fiveWicketHauls: { type: Number, default: 0 },

    // Fielding stats
    catches: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 },

    // Recent form: last 5 innings scores
    recentScores: [{ type: Number }],
    recentWickets: [{ type: Number }],

    totalMatches: { type: Number, default: 0 },
  },
  { timestamps: true }
);

playerStatsCacheSchema.index({ clubId: 1, totalRuns: -1 });
playerStatsCacheSchema.index({ clubId: 1, totalWickets: -1 });
playerStatsCacheSchema.index({ playerId: 1, clubId: 1 }, { unique: true });

module.exports = mongoose.model('PlayerStatsCache', playerStatsCacheSchema);
