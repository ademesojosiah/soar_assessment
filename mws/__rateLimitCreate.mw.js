module.exports = ({ meta, config, cache, managers }) => {
  const WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const MAX_REQUESTS = 50; // 50 create operations per hour
  const WINDOW_SECONDS = Math.floor(WINDOW_MS / 1000);

  return async ({ req, res, next }) => {
    // Get client IP
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      "unknown";

    const key = `ratelimit:create:${clientIp}`;

    try {
      // Get current count from Redis
      const current = await cache.key.get({ key });
      const count = current ? parseInt(current, 10) : 0;

      // Check if rate limit exceeded
      if (count >= MAX_REQUESTS) {
        const ttl = await cache.key.ttl({ key });
        const resetTime = new Date(
          Date.now() + (ttl > 0 ? ttl * 1000 : WINDOW_MS),
        );
        const retryAfterSeconds = ttl > 0 ? ttl : WINDOW_SECONDS;

        console.warn(
          `[RATE LIMIT - CREATE] IP ${clientIp} exceeded create rate limit (${count}/${MAX_REQUESTS})`,
        );

        res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
        res.setHeader("X-RateLimit-Remaining", 0);
        res.setHeader("X-RateLimit-Reset", resetTime.toISOString());
        res.setHeader("Retry-After", retryAfterSeconds);

        return managers.responseDispatcher.dispatch(res, {
          ok: false,
          code: 429,
          message: "Too many create requests, please try again later",
          errors: ["CREATE_RATE_LIMIT_EXCEEDED"],
          retryAfter: retryAfterSeconds,
        });
      }

      // Increment counter in Redis
      if (count === 0) {
        // First request - set with expiry
        await cache.key.set({ key, data: 1, ttl: WINDOW_SECONDS });
      } else {
        // Increment existing counter
        await cache.key.incr({ key });
      }

      // Calculate remaining requests and reset time
      const remaining = Math.max(0, MAX_REQUESTS - count - 1);
      const ttl = await cache.key.ttl({ key });
      const resetTime = new Date(
        Date.now() + (ttl > 0 ? ttl * 1000 : WINDOW_MS),
      );

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", resetTime.toISOString());

      next({
        rateLimited: false,
        remaining,
        resetTime,
      });
    } catch (error) {
      console.error("[RATE LIMIT - CREATE] Redis error:", error);
      // On Redis error, allow the request to proceed
      next({});
    }
  };
};
