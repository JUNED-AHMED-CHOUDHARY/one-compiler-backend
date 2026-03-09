import { Router } from "express";
import healthRouter from "./health-route";
import codeRoutes from "./codeRoutes";

const indexRoutes = Router();

indexRoutes.use("/health", healthRouter);
indexRoutes.use("/code", codeRoutes);

export default indexRoutes;
