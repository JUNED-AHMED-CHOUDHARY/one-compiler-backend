import Dockerode from "dockerode";

import { drainStream } from "../../utilities/streamUtils";

import { dockerClient } from "./dockerClient";

type ExecCmd = string[];

/**
 * Low-level Engine API helpers shared by the warm pool and container executor.
 * Keep this free of judging/business logic.
 */
export class ContainerExec {
  static getContainer(nameOrId: string): Dockerode.Container {
    return dockerClient.getContainer(nameOrId);
  }

  static async runAndDrain(containerName: string, Cmd: ExecCmd): Promise<void> {
    const container = this.getContainer(containerName);
    const exec = await container.exec({
      Cmd,
      AttachStdout: true,
      AttachStderr: true
    });
    const stream = await exec.start({ hijack: true, stdin: false });
    await drainStream(stream);
  }

  static async runDetached(containerName: string, Cmd: ExecCmd): Promise<void> {
    const container = this.getContainer(containerName);
    const exec = await container.exec({
      Cmd,
      AttachStdout: false,
      AttachStderr: false
    });
    await exec.start({ Detach: true });
  }
}
