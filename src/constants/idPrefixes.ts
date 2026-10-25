export enum ID_PREFIXES {
  USER = "usr",
  PROBLEM = "prb",
  AUTHOR = "autr",
  PROBLEM_CODE_TEMPLATE = "pct",
  // BullMQ ids are per-queue counters; GET /code/result/:id looks across queues, so ids must be global
  EXECUTION_JOB = "exj"
}
