const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const matchManagerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    accessType: {
      type: String,
      enum: ['login', 'token'],
      default: 'token',
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      index: true,
    },
    token: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

matchManagerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

matchManagerSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('MatchManager', matchManagerSchema);
