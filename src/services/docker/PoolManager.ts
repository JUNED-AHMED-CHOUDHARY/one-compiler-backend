import { ShutdownPriority } from "../../types/services/shutdownManger";
import { MAX_MEMORY_LIMIT_KB } from "../../zodValidations/variablesUsedInValidations";
import { logger } from "../logger";
import { shutDownManager } from "../shutDownManager/shutDownManager";

import { ContainerExec } from "./containerExec";
import { dockerClient } from "./dockerClient";
import { SUPPORTED_PROGRAMMING_LANGUAGES } from "./types";

const POOL_CONFIG = {
  javascript: { image: "node:20-alpine", poolSize: 5 },
  python: { image: "python:3.11-alpine", poolSize: 5 },
  cpp: { image: "gcc:13", poolSize: 3 }
} as const;

const MAX_USES_PER_CONTAINER = 50;
const CPUS_PER_CONTAINER = 0.5;
const MAX_ACQUIRE_REPLACEMENTS = 8;

export interface ContainerState {
  name: string;
  language: string;
  uses: number;
}

export type ReleaseOptions = {
  /** Force recycle (TLE, crashed workload, contaminated sandbox). */
  recycle?: boolean;
};

export class WarmPoolManager {
  private static instance: WarmPoolManager;

  private freeContainers: Map<string, ContainerState[]> = new Map();
  private busyContainers: Map<string, ContainerState> = new Map();
  private isShuttingDown = false;

  private constructor() {
    Object.keys(POOL_CONFIG).forEach((language) => this.freeContainers.set(language, []));
  }

  public static getInstance(): WarmPoolManager {
    if (!WarmPoolManager.instance) {
      WarmPoolManager.instance = new WarmPoolManager();
    }
    return WarmPoolManager.instance;
  }

  public async initialize() {
    logger.info("🚀 Initializing Strict Docker Warm Pool (Engine API)...");

    await this.cleanupAllContainers();
    this.isShuttingDown = false;

    const startupPromises: Promise<void>[] = [];

    for (const [language, config] of Object.entries(POOL_CONFIG)) {
      for (let i = 0; i < config.poolSize; i++) {
        const containerName = `warm_${language}_${i}`;
        startupPromises.push(this.spawnContainer(containerName, language, config.image));
      }
    }

    await Promise.allSettled(startupPromises);
    logger.info("✅ Warm Pool initialized via Docker Engine API.");
  }

  private async spawnContainer(name: string, language: string, image: string): Promise<void> {
    try {
      try {
        await dockerClient.getContainer(name).remove({ force: true });
      } catch {
        /* not present */
      }

      const created = await dockerClient.createContainer({
        name,
        Image: image,
        Cmd: ["tail", "-f", "/dev/null"],
        WorkingDir: "/workspace",
        HostConfig: {
          Memory: MAX_MEMORY_LIMIT_KB * 1024,
          NanoCpus: Math.floor(CPUS_PER_CONTAINER * 1e9),
          NetworkMode: "none",
          PidsLimit: 64,
          ReadonlyRootfs: true,
          AutoRemove: true,
          Tmpfs: {
            "/workspace": "rw,exec,nosuid,size=50m"
          }
        }
      });

      await created.start();
      this.freeContainers.get(language)?.push({ name, language, uses: 0 });
      logger.info(`🐳 Spun up idle container: ${name}`);
    } catch (error) {
      logger.error(`❌ Failed to start container ${name}:`, error);
    }
  }

  public async acquire(language: SUPPORTED_PROGRAMMING_LANGUAGES, replacementsLeft = MAX_ACQUIRE_REPLACEMENTS): Promise<ContainerState> {
    if (this.isShuttingDown) throw new Error("Server is shutting down. Cannot acquire resources.");

    const queue = this.freeContainers.get(language);
    if (!queue || queue.length === 0) {
      throw new Error(`Queue exhaustion: No available containers for ${language}.`);
    }

    const container = queue.shift()!;

    try {
      await ContainerExec.runAndDrain(container.name, ["echo", "alive"]);
    } catch {
      logger.warn(`⚠️ Container ${container.name} failed health check. Replacing...`);
      await this.replaceContainer(container);

      if (replacementsLeft <= 0) {
        throw new Error(`Unable to acquire a healthy container for ${language} after repeated replacements.`);
      }

      return this.acquire(language, replacementsLeft - 1);
    }

    this.busyContainers.set(container.name, container);
    return container;
  }

  async release(container: ContainerState, options: ReleaseOptions = {}) {
    this.busyContainers.delete(container.name);
    container.uses += 1;

    if (options.recycle || container.uses >= MAX_USES_PER_CONTAINER) {
      if (container.uses >= MAX_USES_PER_CONTAINER) {
        logger.info(`♻️ Recycling container ${container.name} (Reached max uses)`);
      }
      await this.replaceContainer(container);
      return;
    }

    try {
      await ContainerExec.runAndDrain(container.name, ["sh", "-c", "rm -rf /workspace/*"]);
      this.freeContainers.get(container.language)?.push(container);
    } catch {
      logger.error(`Failed to scrub container ${container.name}. Forcing recycle.`);
      await this.replaceContainer(container);
    }
  }

  private async replaceContainer(container: ContainerState): Promise<void> {
    try {
      await dockerClient.getContainer(container.name).remove({ force: true });
    } catch {
      /* already gone / AutoRemove */
    }

    const image = POOL_CONFIG[container.language as keyof typeof POOL_CONFIG].image;
    try {
      await this.spawnContainer(container.name, container.language, image);
    } catch (error) {
      logger.error(`Failed to replace container ${container.name}`, error);
    }
  }

  public async cleanupAllContainers(markShuttingDown = false): Promise<void> {
    if (markShuttingDown) {
      this.isShuttingDown = true;
    }

    logger.info("\n🧹Sweeping up Warm Pool containers...");
    try {
      const containers = await dockerClient.listContainers({
        all: true,
        filters: { name: ["warm_"] }
      });

      await Promise.all(
        containers.map(async (summary) => {
          try {
            await dockerClient.getContainer(summary.Id).remove({ force: true });
          } catch {
            /* ignore */
          }
        })
      );

      this.freeContainers.forEach((queue) => {
        queue.length = 0;
      });
      this.busyContainers.clear();

      logger.info("🧼 Cleaned up all execution containers.");
    } catch (error) {
      logger.error("Error during cleanup:", error);
    }
  }
}

export const poolManager = WarmPoolManager.getInstance();

shutDownManager.registerCleanupTask({
  name: "DockerPoolManager",
  priority: ShutdownPriority.HIGH,
  task: async () => {
    logger.info("Initiating cleanup of all active Docker sandbox containers...");
    try {
      await poolManager.cleanupAllContainers(true);
      logger.info("Docker sandbox containers terminated successfully.");
    } catch (error) {
      logger.error("Failed to cleanup Docker containers during shutdown.", { error });
    }
  }
});
