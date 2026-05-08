/**
 * Live Score Redis Service.
 *
 * Every scoring action writes the current match summary to Redis as a JSON
 * hash and publishes an event on the `live_scores` channel.
 *
 * Frontend clients subscribe to `live_scores` via Socket.IO rooms,
 * which are bridged through the matchHandler socket subscriber.
 *
 * Redis Key Pattern:
 *   live:match:<matchId>   → JSON stringified summary snapshot
 *
 * Pub/Sub Channel:
 *   live_scores             → { matchId, clubId, summary }
 */
const { getPublisher, getIsConnected } = require('../config/redis');

const CHANNEL = 'live_scores';
const KEY_PREFIX = 'live:match:';
const TTL_SECONDS = 60 * 60 * 4; // 4 hours — long enough for any match

/**
 * Publish a match summary snapshot to Redis.
 * Called after every scoring mutation (addScore, addWicket, addExtra, undo, etc.)
 */
const publishMatchSummary = async (matchId, clubId, summary) => {
  if (!getIsConnected()) return; // graceful fallback

  const publisher = getPublisher();
  if (!publisher) return;

  try {
    const key = `${KEY_PREFIX}${matchId}`;
    const payload = JSON.stringify({
      matchId,
      clubId,
      summary,
      timestamp: Date.now(),
    });

    // Cache the latest state (so new subscribers get it immediately)
    await publisher.set(key, payload, 'EX', TTL_SECONDS);

    // Publish for real-time subscribers
    await publisher.publish(CHANNEL, payload);
  } catch (err) {
    console.error('❌ Redis publishMatchSummary error:', err.message);
  }
};

/**
 * Get the latest cached summary from Redis for a match.
 * Useful when a new socket client connects and wants instant state.
 */
const getCachedSummary = async (matchId) => {
  if (!getIsConnected()) return null;

  const publisher = getPublisher();
  if (!publisher) return null;

  try {
    const raw = await publisher.get(`${KEY_PREFIX}${matchId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('❌ Redis getCachedSummary error:', err.message);
    return null;
  }
};

/**
 * Remove a match from Redis (called when match ends or is abandoned).
 */
const removeLiveMatch = async (matchId) => {
  if (!getIsConnected()) return;

  const publisher = getPublisher();
  if (!publisher) return;

  try {
    await publisher.del(`${KEY_PREFIX}${matchId}`);
  } catch (err) {
    console.error('❌ Redis removeLiveMatch error:', err.message);
  }
};

/**
 * Get all currently live match keys from Redis.
 */
const getAllLiveMatches = async () => {
  if (!getIsConnected()) return [];

  const publisher = getPublisher();
  if (!publisher) return [];

  try {
    const keys = await publisher.keys(`${KEY_PREFIX}*`);
    if (!keys.length) return [];

    const values = await publisher.mget(keys);
    return values.filter(Boolean).map((v) => JSON.parse(v));
  } catch (err) {
    console.error('❌ Redis getAllLiveMatches error:', err.message);
    return [];
  }
};

module.exports = {
  CHANNEL,
  publishMatchSummary,
  getCachedSummary,
  removeLiveMatch,
  getAllLiveMatches,
};
