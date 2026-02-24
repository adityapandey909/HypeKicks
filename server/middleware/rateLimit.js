const buckets = new Map();

function shouldResetBucket(bucket, now, windowMs) {
  return !bucket || now - bucket.windowStart > windowMs;
}

export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = "Too many requests" } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    let bucket = buckets.get(key);

    if (shouldResetBucket(bucket, now, windowMs)) {
      bucket = { count: 0, windowStart: now };
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      const retryAfter = Math.ceil((windowMs - (now - bucket.windowStart)) / 1000);
      res.set("Retry-After", String(Math.max(1, retryAfter)));
      return res.status(429).json({ message });
    }

    if (buckets.size > 10000) {
      for (const [bucketKey, entry] of buckets.entries()) {
        if (now - entry.windowStart > windowMs) {
          buckets.delete(bucketKey);
        }
      }
    }

    next();
  };
}
