import crypto from "crypto";

export default function requestLogger(req, res, next) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const elapsedMs = Date.now() - startedAt;
    const log = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      elapsedMs,
      ip: req.ip,
    };

    console.log(`[request] ${JSON.stringify(log)}`);
  });

  next();
}
