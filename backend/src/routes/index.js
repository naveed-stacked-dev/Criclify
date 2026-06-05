const router = require('express').Router();

const authRoutes = require('./auth.routes');
const clubRoutes = require('./club.routes');
const teamRoutes = require('./team.routes');
const playerRoutes = require('./player.routes');
const tournamentRoutes = require('./tournament.routes');
const matchRoutes = require('./match.routes');
const scoringRoutes = require('./scoring.routes');
const analyticsRoutes = require('./analytics.routes');

// New Routes
const adminRoutes = require('./admin.routes');
const publicRoutes = require('./public.routes');
const settingsRoutes = require('./settings.routes');
const pointsTableRoutes = require('./pointsTable.routes');
const uploadRoutes = require('./upload.routes');
const contentRoutes = require('./content.routes');
const documentRoutes = require('./document.routes');

router.use('/auth', authRoutes);
router.use('/clubs', clubRoutes);
router.use('/teams', teamRoutes);
router.use('/players', playerRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/matches', matchRoutes);
router.use('/scoring', scoringRoutes);
router.use('/analytics', analyticsRoutes);

// Mount new routes
router.use('/admin', adminRoutes);
router.use('/public', publicRoutes);
router.use('/settings', settingsRoutes);
router.use('/points-table', pointsTableRoutes);
router.use('/upload', uploadRoutes);
router.use('/content', contentRoutes);
router.use('/documents', documentRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Club Arena X API is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
