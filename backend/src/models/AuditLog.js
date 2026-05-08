const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'match_started',
        'score_added',
        'wicket_added',
        'extra_added',
        'undo',
        'inning_switch',
        'match_ended',
        'match_resumed',
        'match_paused',
        'super_over_started',
        'active_players_updated',
        'substitute_added',
      ],
    },
    performedBy: {
      id: { type: mongoose.Schema.Types.ObjectId },
      role: { type: String },
    },
    eventData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ matchId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
