import { Processor, UnrecoverableError } from "bullmq";

import ProblemServices from "../../dbServices/problemServices";
import { logger } from "../../services/logger";
import { verifyMongoChecks, verifyProblemToBePublishedBasicChecks } from "../jobHelpers/verifyAndPublishJobHelper";

const verifyAndPublishJob: Processor = async (job) => {
  console.log(`\n[Worker] Picked up Job ID: ${job.id}`);

  // TODO: need to add the logic to verify and publish the problem
  const { problemId } = job.data;

  try {
    if (!problemId) throw new UnrecoverableError("Problem id is required");

    const problem = await ProblemServices.getProblemByIdWithInclude(problemId, { code_templates: true });

    if (!problem) throw new UnrecoverableError("Problem not found");

    // basic checks
    verifyProblemToBePublishedBasicChecks(problem); // throws error in catch directly

    // next checks on db
    await verifyMongoChecks(problemId, problem.evaluation_type);
  } catch (error) {
    logger.error(`[Worker] Error in verifyAndPublishJob: ${error}`);
    throw error;
  }
};

export default verifyAndPublishJob;
