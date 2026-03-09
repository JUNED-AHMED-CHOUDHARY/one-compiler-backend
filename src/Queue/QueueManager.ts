import { Processor, Queue, QueueOptions, Worker, WorkerOptions } from "bullmq";
import redisClient from "../config/redis";
import { logger } from "../services/logger";
import { defaultJobOptions, QUEUE_NAMES } from "./QueueNames";
import ENV from "../config/ENV";

class QueueManager {
  private static instance: QueueManager;
  private queues = new Map<QUEUE_NAMES, Queue>();
  private workers = new Map<QUEUE_NAMES, Worker>();

  private constructor() {}

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }

    return QueueManager.instance;
  }

  public getQueue(name: QUEUE_NAMES, options?: QueueOptions): Queue {
    if (!this.queues.has(name)) {
      this.queues.set(name, new Queue(name, { connection: redisClient as any, prefix: ENV.NODE_ENV, defaultJobOptions, ...options }));
    }

    return this.queues.get(name)!;
  }

  public createWorker(name: QUEUE_NAMES, processor: Processor | string, opts?: Partial<WorkerOptions>) {
    if (this.workers.has(name)) {
      logger.warn(`⚠️ Worker for [${name}] is already running in this process.`);
      return;
    }

    if (!this.queues.has(name)) {
      logger.info(`⚙️ Auto-initializing Queue [${name}] for the new worker...`);
      this.getQueue(name);
    }
    const worker = new Worker(name, processor, {
      connection: redisClient as any,
      prefix: ENV.NODE_ENV,
      useWorkerThreads: true,
      ...opts
    });

    this.workers.set(name, worker);

    worker.on("failed", (job, err) => {
      logger.error(`❌ [${name}] Job ${job?.id} failed:`, { error: err.message });
    });

    worker.on("error", (error) => {
      logger.error(`❌ [${name}] Worker error:`, { error: error.message });
    });

    worker.on("completed", (job) => {
      logger.info(`✅ [${name}] Job ${job?.id} completed successfully.`);
    });
  }
}

export const queueManager = QueueManager.getInstance();
