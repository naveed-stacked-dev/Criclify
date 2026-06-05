const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      enum: ['rulebook', 'permit', 'schedule', 'contract', 'announcement', 'other'],
      default: 'other',
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    mimeType: {
      type: String,
      default: null,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'Club ID is required'],
      index: true,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'uploaderModel',
      default: null,
    },
    uploaderModel: {
      type: String,
      enum: ['ClubManager', 'SuperAdmin'],
      default: 'ClubManager',
    },
  },
  { timestamps: true }
);

documentSchema.index({ clubId: 1, category: 1 });
documentSchema.index({ clubId: 1, tournamentId: 1 });

module.exports = mongoose.model('Document', documentSchema);
