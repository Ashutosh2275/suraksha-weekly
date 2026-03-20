import { Router } from "express";
import { config } from "../config.js";
import { observabilitySnapshot } from "../services/observabilityService.js";

export const internalRouter = Router();

function dependencies() {
  return {
    database: config.databaseUrl ? "configured" : "mock",
    cache: config.redisUrl ? "configured" : "mock",
    queue: "in-memory",
    fraud_service: "in-process"
  };
}

internalRouter.get("/live", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: config.appName,
    version: config.apiVersion,
    timestamp: new Date().toISOString(),
    checks: dependencies(),
    degraded: false,
    degraded_reasons: []
  });
});

internalRouter.get("/ready", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: config.appName,
    version: config.apiVersion,
    timestamp: new Date().toISOString(),
    checks: dependencies(),
    degraded: false,
    degraded_reasons: [],
    ready: true
  });
});

internalRouter.get("/startup", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: config.appName,
    version: config.apiVersion,
    timestamp: new Date().toISOString(),
    checks: dependencies(),
    degraded: false,
    degraded_reasons: [],
    startup: "complete"
  });
});

internalRouter.get("/metrics", (_req, res) => {
  res.status(200).json({
    service: config.appName,
    version: config.apiVersion,
    metrics: observabilitySnapshot()
  });
});
