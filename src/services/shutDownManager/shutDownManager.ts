import ENV from "../../config/ENV";
import { CleanupTask } from "../../types/services/shutdownManger";
import { logger } from "../logger";

class ShutDownManager {
  private static instance: ShutDownManager;
  private cleanupTasks: CleanupTask[] = [];
  private isShuttingDown = false;

  private readonly SHUTDOWN_TIMEOUT_IN_MS = ENV.SHUTDOWN_TIMEOUT_IN_MS;

  private constructor() {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers() {
    process.on("SIGINT", () => this.shutdown("SIGINT", 0));
    process.on("SIGTERM", () => this.shutdown("SIGTERM", 0));

    process.on("uncaughtException", (error) => {
      logger.error("💥 Uncaught Exception! App state is undefined. Crashing immediately...", { error });
      process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
      logger.error("💥 Unhandled Promise Rejection! App state is undefined. Crashing immediately...", { reason });
      process.exit(1);
    });
  }

  public registerCleanupTask(task: CleanupTask) {
    this.cleanupTasks.push(task);
    this.cleanupTasks.sort((a, b) => b.priority - a.priority);
    logger.debug(`Registered cleanup task: ${task.name} (Priority: ${task.priority})`);
  }

  public async shutdown(signal: string, exitCode: number) {
    if (this.isShuttingDown) {
      logger.warn(`Shutdown already in progress. Ignoring ${signal} signal.`);
      return;
    }

    this.isShuttingDown = true;

    const forceShutdown = setTimeout(() => {
      logger.error(`🚨 Graceful shutdown timed out (${this.SHUTDOWN_TIMEOUT_IN_MS}ms). Forcing exit.`);
      process.exit(1);
    }, this.SHUTDOWN_TIMEOUT_IN_MS);

    forceShutdown.unref();

    try {
      for (const task of this.cleanupTasks) {
        logger.info(`Executing cleanup task: ${task.name}...`);
        try {
          await task.task();
        } catch (taskError) {
          logger.error(`❌ Cleanup task '${task.name}' failed:`, { taskError });
        }
      }

      logger.info("✅ Shutdown completed successfully.");
      clearTimeout(forceShutdown);
      process.exit(exitCode);
    } catch (criticalError) {
      logger.error("💥 Critical system failure during shutdown sequence orchestrator.", { criticalError });
      clearTimeout(forceShutdown);
      process.exit(1);
    }
  }

  public static getInstance(): ShutDownManager {
    if (!ShutDownManager.instance) {
      ShutDownManager.instance = new ShutDownManager();
    }
    return ShutDownManager.instance;
  }
}

export const shutDownManager = ShutDownManager.getInstance();
