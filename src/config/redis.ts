import Redis, { RedisOptions } from "ioredis";

import { logger } from "../services/logger";
import { shutDownManager } from "../services/shutDownManager/shutDownManager";
import { ShutdownPriority } from "../types/services/shutdownManger";

import ENV from "./ENV";
// ⚠️ CRITICAL UPSTASH + BULLMQ SETTINGS ⚠️
const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  keepAlive: 10000,
  family: 4,
  tls: {}
};

class Client {
  private static instance: Redis;

  private constructor() {}

  static getInstance(): Redis {
    if (!Client.instance) {
      if (!ENV.REDIS_URI?.trim()) {
        logger.error("❌ REDIS_URI is missing. Please set it in your environment.");
        throw new Error("REDIS_URI is missing");
      }

      logger.info("🔌 Initializing Redis client", { hasRedisUri: true });
      Client.instance = new Redis(ENV.REDIS_URI, redisOptions);
      Client.instance.on("error", (err) => {
        logger.error("❌ Redis Connection Error", { error: err.message });
      });

      Client.instance.on("connect", () => {
        logger.info("✅ Successfully connected to Upstash Redis");
      });

      Client.instance.on("ready", () => {
        logger.info("✅ Redis client is ready to accept commands");
      });

      Client.instance.on("reconnecting", () => {
        logger.warn("⚠️ Reconnecting to Upstash Redis...");
      });
    }
    return Client.instance;
  }
}

const redisClient = Client.getInstance();

shutDownManager.registerCleanupTask({
  name: "RedisClient",
  priority: ShutdownPriority.LOW,
  task: async () => {
    logger.info("Gracefully quitting Redis connection...");
    try {
      await redisClient.quit();
      logger.info("Redis disconnected successfully.");
    } catch (error) {
      logger.error("Error closing Redis connection. Forcing disconnect:", { error });
      redisClient.disconnect();
    }
  }
});

export default redisClient;
