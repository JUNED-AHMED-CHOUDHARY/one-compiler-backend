import { spawn } from "node:child_process";

import { ShutdownPriority } from "../../types/services/shutdownManger";
import { MAX_MEMORY_LIMIT_KB } from "../../zodValidations/variablesUsedInValidations";
import { logger } from "../logger";
import { shutDownManager } from "../shutDownManager/shutDownManager";

const POOL_CONFIG = {
  javascript: { image: "node:20-alpine", poolSize: 5 },
  python: { image: "python:3.11-alpine", poolSize: 5 },
  cpp: { image: "gcc:13", poolSize: 3 }
};

const MAX_USES_PER_CONTAINER = 50;

export interface ContainerState {
  name: string;
  language: string;
  uses: number;
}

const spawnAsync = (command: string, args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => (stdout += data.toString()));
    child.stderr.on("data", (data) => (stderr += data.toString()));

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });

    child.on("error", (err) => reject(err));
  });
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
    logger.info("🚀 Initializing Strict Docker Warm Pool...");

    // Clean up old containers without permanently shutting down
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
    logger.info("✅ Warm Pool initialized securely via spawn.");
  }

  private async spawnContainer(name: string, language: string, image: string): Promise<void> {
    const args = [
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      `--memory=${MAX_MEMORY_LIMIT_KB}kb`,
      "--cpus=0.5",
      "--network",
      "none",
      "--pids-limit",
      "64",
      "--read-only",
      "--tmpfs",
      "/workspace:rw,exec,nosuid,size=50m",
      "-w",
      "/workspace",
      image,
      "tail",
      "-f",
      "/dev/null"
    ];

    try {
      await spawnAsync("docker", args);
      this.freeContainers.get(language)?.push({ name, language, uses: 0 });
      logger.info(`🐳 Spun up idle container: ${name}`);
    } catch (error) {
      logger.error(`❌ Failed to start container ${name}:`, error);
    }
  }

  public async acquire(language: string): Promise<ContainerState> {
    if (this.isShuttingDown) throw new Error("Server is shutting down. Cannot acquire resources.");

    const queue = this.freeContainers.get(language);
    if (!queue || queue.length === 0) {
      throw new Error(`Queue exhaustion: No available containers for ${language}.`);
    }

    const container = queue.shift()!;

    try {
      await spawnAsync("docker", ["exec", container.name, "echo", "alive"]);
    } catch {
      // FIX: Removed unused (_: any)
      logger.warn(`⚠️ Container ${container.name} failed health check. Replacing...`);
      await this.replaceContainer(container);
      return this.acquire(language);
    }

    this.busyContainers.set(container.name, container);
    return container;
  }

  async release(container: ContainerState) {
    this.busyContainers.delete(container.name);
    container.uses += 1;

    if (container.uses >= MAX_USES_PER_CONTAINER) {
      logger.info(`♻️ Recycling container ${container.name} (Reached max uses)`);
      await this.replaceContainer(container);
    } else {
      try {
        await spawnAsync("docker", ["exec", container.name, "sh", "-c", "rm -rf /workspace/*"]);
        this.freeContainers.get(container.language)?.push(container);
      } catch {
        // FIX: Removed unused (e)
        logger.error(`Failed to scrub container ${container.name}. Forcing recycle.`);
        await this.replaceContainer(container);
      }
    }
  }

  private async replaceContainer(container: ContainerState): Promise<void> {
    try {
      await spawnAsync("docker", ["rm", "-f", container.name]);
    } catch {
      // FIX: Removed unused (_: any)
      /* Ignore if dead */
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
      const stdout = await spawnAsync("docker", ["ps", "-a", "-q", "--filter=name=warm_"]);
      const containerIds = stdout.trim().split("\n").filter(Boolean);

      if (containerIds.length > 0) {
        await spawnAsync("docker", ["rm", "-f", ...containerIds]);
      }
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
