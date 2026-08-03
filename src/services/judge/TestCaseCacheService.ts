import fsPromises from "node:fs/promises";
import path from "node:path";

import { HARNESS_CACHE_DIR } from "../../constants/middlewareConstants";
import ProblemServices from "../../dbServices/problemServices";
import { logger } from "../logger";

import { HarnessPayloadBuilder } from "./buildHarnessPayload";

export type CachedHarnessPayload = {
  absolutePath: string;
  testcaseCount: number;
  bytes: number;
};

type HarnessMeta = {
  testcaseCount: number;
  harnessGridFsId: string;
  builtAt: string;
};

/**
 * Local disk cache of the pre-built harness blob.
 * Source of truth: Problems.harness_payload_gridfs_id (single GridFS file).
 */
export class TestCaseCacheService {
  private static readonly cacheRoot = HARNESS_CACHE_DIR;
  private static readonly inflight = new Map<string, Promise<CachedHarnessPayload>>();

  private static cachePathFor(problemId: string): string {
    return path.join(this.cacheRoot, `${problemId}.harness.in`);
  }

  private static metaPathFor(problemId: string): string {
    return path.join(this.cacheRoot, `${problemId}.harness.meta.json`);
  }

  static async invalidate(problemId: string): Promise<void> {
    this.inflight.delete(problemId);
    await Promise.allSettled([fsPromises.unlink(this.cachePathFor(problemId)), fsPromises.unlink(this.metaPathFor(problemId))]);
    logger.info(`[TestCaseCache] Invalidated local cache for problem ${problemId}`);
  }

  static async getHarnessPayload(problemId: string): Promise<CachedHarnessPayload> {
    const existing = this.inflight.get(problemId);
    if (existing) return existing;

    const promise = this.getOrMaterialize(problemId).finally(() => this.inflight.delete(problemId));
    this.inflight.set(problemId, promise);
    return promise;
  }

  private static async getOrMaterialize(problemId: string): Promise<CachedHarnessPayload> {
    await fsPromises.mkdir(this.cacheRoot, { recursive: true });

    const absolutePath = this.cachePathFor(problemId);
    const metaPath = this.metaPathFor(problemId);

    const problem = await ProblemServices.getProblemHarnessMeta(problemId);
    if (!problem?.harness_payload_gridfs_id) {
      throw new Error(`Harness payload missing for problem ${problemId}. Re-upload testcases to generate the pre-built harness file.`);
    }

    const harnessGridFsId = problem.harness_payload_gridfs_id;

    try {
      const [stat, metaRaw] = await Promise.all([fsPromises.stat(absolutePath), fsPromises.readFile(metaPath, "utf-8")]);
      const meta = JSON.parse(metaRaw) as HarnessMeta;

      if (stat.size > 0 && meta.testcaseCount > 0 && meta.harnessGridFsId === harnessGridFsId) {
        return { absolutePath, testcaseCount: meta.testcaseCount, bytes: stat.size };
      }
    } catch {
      // miss / stale
    }

    return this.materializeFromGridFs(problemId, harnessGridFsId, absolutePath, metaPath);
  }

  private static async materializeFromGridFs(problemId: string, harnessGridFsId: string, absolutePath: string, metaPath: string): Promise<CachedHarnessPayload> {
    const startedAt = Date.now();
    const bytes = await HarnessPayloadBuilder.downloadGridFsToFile(harnessGridFsId, absolutePath);
    const testcaseCount = await this.readHarnessCaseCount(absolutePath);

    const meta: HarnessMeta = {
      testcaseCount,
      harnessGridFsId,
      builtAt: new Date().toISOString()
    };
    await fsPromises.writeFile(metaPath, JSON.stringify(meta), "utf-8");

    logger.info(`[TestCaseCache] Materialized harness for ${problemId} from GridFS (${bytes} bytes, ${testcaseCount} cases) in ${Date.now() - startedAt}ms`);

    return { absolutePath, testcaseCount, bytes };
  }

  private static async readHarnessCaseCount(absolutePath: string): Promise<number> {
    const handle = await fsPromises.open(absolutePath, "r");
    try {
      const { buffer, bytesRead } = await handle.read({
        buffer: Buffer.alloc(64),
        offset: 0,
        length: 64,
        position: 0
      });
      const firstLine = buffer.subarray(0, bytesRead).toString("utf-8").split(/\r?\n/, 1)[0] ?? "";
      const testcaseCount = Number(firstLine);

      if (!Number.isFinite(testcaseCount) || testcaseCount <= 0) {
        throw new Error(`Invalid harness header in ${absolutePath}`);
      }

      return testcaseCount;
    } finally {
      await handle.close();
    }
  }
}
