import { logger } from "../services/logger";

export type JobStepTimer = {
  measure: <T>(step: string, fn: () => Promise<T> | T) => Promise<T>;
  summaryMs: () => number;
  formatSummary: () => string;
};

/** Wall-clock step timings for BullMQ workers (reusable across jobs). */
export const createJobStepTimer = (jobId: string, logPrefix = "[Worker]"): JobStepTimer => {
  const timings = new Map<string, number>();
  const jobStartedAt = Date.now();

  return {
    measure: async <T>(step: string, fn: () => Promise<T> | T): Promise<T> => {
      const startedAt = Date.now();
      try {
        return await fn();
      } finally {
        const durationMs = Date.now() - startedAt;
        timings.set(step, durationMs);
        logger.info(`${logPrefix} Job ${jobId} | timing.${step}=${durationMs}ms`);
      }
    },
    summaryMs: () => Date.now() - jobStartedAt,
    formatSummary: () => {
      const parts = [...timings.entries()].map(([step, ms]) => `${step}=${ms}ms`);
      parts.push(`total=${Date.now() - jobStartedAt}ms`);
      return parts.join(" | ");
    }
  };
};
