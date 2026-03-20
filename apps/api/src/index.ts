import pino from "pino";
import { createApp } from "./app.js";
import { config } from "./config.js";

const logger = pino({ name: config.appName, level: config.nodeEnv === "production" ? "info" : "debug" });
const app = createApp();

app.listen(config.port, () => {
  logger.info(`API started on port ${config.port}`);
});
