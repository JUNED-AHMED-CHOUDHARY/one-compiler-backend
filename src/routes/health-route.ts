import { Router } from "express";
import { StatusCodes } from "http-status-codes";

import ENV from "../config/ENV";

const healthRouter = Router();

healthRouter.get("/check", (_req, res) => {
  res.status(StatusCodes.OK).json({
    status: "ok",
    environment: ENV.NODE_ENV,
  });
});

export default healthRouter;
