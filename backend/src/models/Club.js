const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Club name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    logo: {
      type: String,
      default: null,
    },
    bannerUrl: {
      type: String,
      default: null,
    },
    themeColor: {
      type: String,
      default: '#7c3aed',
    },
    theme: {
      primaryColor: { type: String, default: '#1a73e8' },
      secondaryColor: { type: String, default: '#ffffff' },
      template: {
        type: String,
        enum: ['classic', 'cricket-ball', 'stadium', 'pitch-lines', 'trophy-gold'],
        default: 'classic',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      required: true,
    },
    settings: {
      oversPerInning: { type: Number, default: 20 },
      maxPlayersPerTeam: { type: Number, default: 15 },
      maxTeams: { type: Number, default: 16 },
      wideReBall: { type: Boolean, default: true },
      noBallReBall: { type: Boolean, default: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

clubSchema.index({ createdBy: 1 });
clubSchema.index({ name: 'text', slug: 'text' });

module.exports = mongoose.model('Club', clubSchema);
