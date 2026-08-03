import Docker from "dockerode";

/**
 * Singleton Docker Engine client (socket API — no CLI spawn).
 * Windows: named pipe. Linux/macOS: unix socket.
 */
const createDockerClient = (): Docker => {
  if (process.platform === "win32") {
    return new Docker({ socketPath: "//./pipe/docker_engine" });
  }

  return new Docker({ socketPath: "/var/run/docker.sock" });
};

export const dockerClient = createDockerClient();
