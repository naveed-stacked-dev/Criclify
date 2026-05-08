/**
 * Socket.IO match handler.
 * Manages real-time room subscriptions for live match scoring.
 *
 * Architecture:
 *   Admin scores → Controller → Redis PUBLISH → this handler → Socket.IO rooms → Frontend
 *
 * This handler subscribes to the Redis `live_scores` channel and broadcasts
 * each update to the matching socket room `match_<matchId>`.
 */
const { getSubscriber, getIsConnected } = require('../config/redis');
const { CHANNEL, getCachedSummary } = require('../services/liveScoreRedis');

const setupMatchSocket = (io) => {
  // ─── Redis subscriber bridge ───
  const bridgeRedisToSockets = () => {
    const subscriber = getSubscriber();
    if (!subscriber || !getIsConnected()) {
      console.warn('⚠️  Redis not connected — socket updates will use direct emit only');
      return;
    }

    subscriber.subscribe(CHANNEL, (err) => {
      if (err) {
        console.error('❌ Redis subscribe error:', err.message);
        return;
      }
      console.log(`📡 Socket handler subscribed to Redis channel: ${CHANNEL}`);
    });

    subscriber.on('message', (channel, message) => {
      if (channel !== CHANNEL) return;

      try {
        const data = JSON.parse(message);
        const { matchId, clubId, summary } = data;

        if (matchId) {
          // Broadcast to match-specific room
          io.to(`match_${matchId}`).emit('match_summary', summary);
          io.to(`match_${matchId}`).emit('live_update', data);
        }

        if (clubId) {
          // Broadcast to club-wide room (for club home page live panel)
          io.to(`club_${clubId}`).emit('club_live_update', data);
        }
      } catch (err) {
        console.error('❌ Redis message parse error:', err.message);
      }
    });
  };

  // ─── Socket connection handler ───
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    /**
     * Client joins a match room to receive live updates.
     * Usage: socket.emit('join_match', { matchId: '...' })
     */
    socket.on('join_match', async ({ matchId }) => {
      if (!matchId) {
        return socket.emit('error', { message: 'matchId is required' });
      }

      const room = `match_${matchId}`;
      socket.join(room);
      console.log(`📺 Socket ${socket.id} joined room: ${room}`);

      socket.emit('joined', {
        message: `Subscribed to match ${matchId}`,
        room,
      });

      // Send cached summary immediately so the client doesn't have to wait
      try {
        const cached = await getCachedSummary(matchId);
        if (cached) {
          socket.emit('match_summary', cached.summary);
        }
      } catch { /* ignore */ }
    });

    /**
     * Client joins a club room to receive all live match updates for that club.
     * Usage: socket.emit('join_club', { clubId: '...' })
     */
    socket.on('join_club', ({ clubId }) => {
      if (!clubId) {
        return socket.emit('error', { message: 'clubId is required' });
      }

      const room = `club_${clubId}`;
      socket.join(room);
      console.log(`📺 Socket ${socket.id} joined club room: ${room}`);

      socket.emit('joined_club', {
        message: `Subscribed to club ${clubId} live updates`,
        room,
      });
    });

    /**
     * Client leaves a match room.
     * Usage: socket.emit('leave_match', { matchId: '...' })
     */
    socket.on('leave_match', ({ matchId }) => {
      if (!matchId) return;

      const room = `match_${matchId}`;
      socket.leave(room);
      console.log(`🚪 Socket ${socket.id} left room: ${room}`);
    });

    /**
     * Client leaves a club room.
     */
    socket.on('leave_club', ({ clubId }) => {
      if (!clubId) return;
      socket.leave(`club_${clubId}`);
    });

    /**
     * Get the number of viewers in a match room.
     */
    socket.on('get_viewers', async ({ matchId }) => {
      if (!matchId) return;

      const room = `match_${matchId}`;
      const sockets = await io.in(room).fetchSockets();
      socket.emit('viewers_count', {
        matchId,
        count: sockets.length,
      });
    });

    /**
     * Handle disconnect — cleanup logging.
     */
    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} (${reason})`);
    });

    /**
     * Handle errors.
     */
    socket.on('error', (error) => {
      console.error(`⚠️ Socket error for ${socket.id}:`, error.message);
    });
  });

  // Bridge Redis to Socket.IO after a short delay to let Redis connect
  setTimeout(() => {
    bridgeRedisToSockets();
  }, 1000);

  console.log('✅ Socket.IO match handler initialized');
};

module.exports = setupMatchSocket;
