export enum ShutdownPriority {
  CRITICAL = 4, // Load balancers, queue pausing
  HIGH = 3, // Sub-processes, external sandboxes (Docker Pool)
  NORMAL = 2, // HTTP Server, Queue Workers (awaiting completion)
  LOW = 1 // Data persistence (Prisma, MongoDB, Redis)
}

export interface CleanupTask {
  name: string;
  priority: ShutdownPriority;
  task: () => Promise<void> | void;
}
