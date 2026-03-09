import Redis, { RedisOptions } from "ioredis";
import ENV from "./ENV";
import { logger } from "../services/logger";
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

export default redisClient;
