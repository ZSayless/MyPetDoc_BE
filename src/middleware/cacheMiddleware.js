const cache = require("../config/redis");

const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cachedData = await cache.get(key);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      res.sendResponse = res.json;
      res.json = (body) => {
        cache.set(key, JSON.stringify(body), duration);
        res.sendResponse(body);
      };

      next();
    } catch (error) {
      console.warn("Cache middleware warning:", error);
      next();
    }
  };
};

module.exports = cacheMiddleware;
