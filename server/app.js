import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import ordersRoutes from "./routes/orders.js";
import productsRoutes from "./routes/products.js";
import uploadsRoutes from "./routes/uploads.js";
import securityHeaders from "./middleware/securityHeaders.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import requestLogger from "./middleware/requestLogger.js";

function toOrigin(input = "") {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";

  try {
    return new URL(trimmed).origin;
  } catch {
    return "";
  }
}

function buildCorsOptions() {
  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const clientOrigin = toOrigin(process.env.CLIENT_URL);
  const pagesOrigin = toOrigin(process.env.GH_PAGES_ORIGIN || "https://adityapandey909.github.io");

  const defaults = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    clientOrigin,
    pagesOrigin,
  ];

  const originAllowlist = new Set([...defaults, ...allowedOrigins]);

  return {
    origin(origin, callback) {
      if (!origin || originAllowlist.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed"), false);
    },
    credentials: true,
  };
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(requestLogger);
  app.use(securityHeaders);
  app.use(cors(buildCorsOptions()));
  app.use(
    express.json({
      limit: "12mb",
      type: (req) => {
        if (String(req.originalUrl || "").startsWith("/api/orders/webhook/stripe")) {
          return false;
        }

        const contentType = String(req.headers["content-type"] || "");
        return contentType.includes("application/json") || contentType.includes("+json");
      },
    })
  );
  app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 500 }));

  app.get("/", (_req, res) => {
    res.status(200).send("HypeKicks API running");
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, service: "hypekicks-api" });
  });

  app.use(
    "/api/auth",
    createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: 40,
      message: "Too many authentication attempts, try again later",
    }),
    authRoutes
  );
  app.use("/api/products", productsRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/uploads", uploadsRoutes);

  app.use((error, req, res, _next) => {
    if (String(error?.message || "").includes("CORS")) {
      return res.status(403).json({ message: "Origin not allowed by CORS policy" });
    }

    console.error("Unhandled server error", {
      requestId: req?.requestId,
      message: error?.message,
    });
    return res.status(500).json({
      message: "Unexpected server error",
      requestId: req?.requestId || null,
    });
  });

  app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  return app;
}
