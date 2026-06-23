import { Processor } from "bullmq";

const verifyAndPublishJob: Processor = async (job) => {
  console.log(`\n[Worker] Picked up Job ID: ${job.id}`);

  // TODO: need to add the logic to verify and publish the problem
};

export default verifyAndPublishJob;
