const Redis = require("ioredis");
const config = require("./config");

let redis = null;
const MAX_RETRY_ATTEMPTS = 3;
let retryCount = 0;

try {
  redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    retryStrategy: (times) => {
      if (retryCount >= MAX_RETRY_ATTEMPTS) {
        console.log(
          "Max Redis retry attempts reached, falling back to memory cache"
        );
        return null;
      }
      retryCount++;
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    enableOfflineQueue: false,
  });

  redis.on("error", (err) => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.log("Switching to memory cache due to Redis connection issues");
    } else {
      console.warn("Redis connection warning:", err);
    }
    redis = null;
  });

  redis.on("connect", () => {
    console.log("Redis connected successfully");
    retryCount = 0;
  });
} catch (error) {
  console.warn("Redis initialization warning, using memory cache instead");
  redis = null;
}

// Memory cache implementation
const memoryCache = new Map();

const cacheWrapper = {
  get: async (key) => {
    try {
      if (redis) {
        return await redis.get(key);
      }
      return memoryCache.get(key);
    } catch (error) {
      console.warn("Cache get warning:", error);
      return null;
    }
  },

  set: async (key, value, ttl = 3600) => {
    try {
      if (redis) {
        return await redis.setex(key, ttl, value);
      }
      memoryCache.set(key, value);
      setTimeout(() => memoryCache.delete(key), ttl * 1000);
    } catch (error) {
      console.warn("Cache set warning:", error);
    }
  },

  del: async (key) => {
    try {
      if (redis) {
        return await redis.del(key);
      }
      return memoryCache.delete(key);
    } catch (error) {
      console.warn("Cache del warning:", error);
    }
  },

  clear: async () => {
    try {
      if (redis) {
        return await redis.flushall();
      }
      return memoryCache.clear();
    } catch (error) {
      console.warn("Cache clear warning:", error);
    }
  },

  hasRedis: () => redis !== null,

  getStatus: () => ({
    type: redis ? "redis" : "memory",
    connected: redis ? redis.status === "ready" : true,
    size: redis ? "unknown" : memoryCache.size,
  }),

  keys: async (pattern) => {
    try {
      if (redis) {
        return await redis.keys(pattern);
      }
      // For memory cache, simulate pattern matching
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return Array.from(memoryCache.keys()).filter(key => regex.test(key));
    } catch (error) {
      console.warn("Cache keys warning:", error);
      return [];
    }
  },
};

module.exports = cacheWrapper;
