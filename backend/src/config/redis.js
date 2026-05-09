/**
 * Redis client singleton.
 * Uses ioredis for pub/sub and caching of live match data.
 * Falls back gracefully if Redis is unavailable — the app still works via HTTP.
 */
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL;
// const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let publisher = null;
let subscriber = null;
let isConnected = false;

const createClient = (label) => { 
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) {
        console.warn(`⚠️  Redis ${label}: giving up after ${times} retries`);
        return null; // stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    // tls: {},
    lazyConnect: true,
  });

  client.on('connect', () => {
    console.log(`✅ Redis ${label} connected`);
    isConnected = true;
  });

  client.on('error', (err) => {
    console.error(`❌ Redis ${label} error:`, err.message);
    isConnected = false;
  });

  client.on('close', () => {
    isConnected = false;
  });

  return client;
};

/**
 * Initialize Redis connections.
 * Publisher is used to SET/PUBLISH, Subscriber is used to SUBSCRIBE.
 */
const initRedis = async () => {
  try {
    publisher = createClient('publisher');
    subscriber = createClient('subscriber');
    await publisher.connect();
    await subscriber.connect();
    console.log('✅ Redis pub/sub initialized');
  } catch (err) {
    console.warn('⚠️  Redis unavailable — live scoring will use direct socket emit:', err.message);
  }
};

const getPublisher = () => publisher;
const getSubscriber = () => subscriber;
const getIsConnected = () => isConnected;

module.exports = {
  initRedis,
  getPublisher,
  getSubscriber,
  getIsConnected,
};
