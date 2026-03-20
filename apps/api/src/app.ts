import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import pino from "pino";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { internalRouter } from "./routes/internal.js";
import { v1Router } from "./routes/v1.js";
import { recordRequestMetric } from "./services/observabilityService.js";

export function createApp() {
  const logger = pino({ name: config.appName, level: config.nodeEnv === "production" ? "info" : "debug" });

  const app = express();
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const workerWebDir = path.resolve(rootDir, "apps", "worker-web");
  const adminWebDir = path.resolve(rootDir, "apps", "admin-web");

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    const requestStarted = process.hrtime.bigint();
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    req.headers["x-request-id"] = requestId;
    res.setHeader("x-request-id", requestId);
    res.locals.requestId = requestId;

    res.on("finish", () => {
      const elapsedNs = Number(process.hrtime.bigint() - requestStarted);
      const elapsedMs = elapsedNs / 1_000_000;
      recordRequestMetric(req.method, req.path, res.statusCode, elapsedMs);
    });

    logger.info({ requestId, method: req.method, path: req.path }, "Incoming request");
    next();
  });

  app.get("/", (_req, res) => {
    res.json({ service: config.appName, version: config.apiVersion, status: "ok" });
  });

  app.use("/worker", express.static(workerWebDir));
  app.use("/admin", express.static(adminWebDir));

  app.use("/internal", internalRouter);
  app.use("/api/v1", v1Router);

  app.use((_req, res) => {
    res.status(404).json({ error_code: "NOT_FOUND", message: "Route not found" });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, "Unhandled error");
    res.status(500).json({ error_code: "INTERNAL_ERROR", message: "Unexpected error" });
  });

  return app;
}
