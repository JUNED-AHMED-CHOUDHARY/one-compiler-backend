import { Readable, Transform } from "node:stream";

export const streamToString = (stream: Readable): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    stream.on("error", reject);
  });

/** Drain a Docker hijack/exec stream so the socket closes cleanly. */
export const drainStream = (stream: NodeJS.ReadableStream): Promise<void> =>
  new Promise((resolve, reject) => {
    stream.on("data", () => undefined);
    stream.on("end", () => resolve());
    stream.on("error", reject);
  });

/** Pass-through that also accumulates bytes (for size accounting without holding forever). */
export const createByteCountingTransform = (onBytes?: (total: number) => void) => {
  let total = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      onBytes?.(total);
      callback(null, buffer);
    }
  });
};
