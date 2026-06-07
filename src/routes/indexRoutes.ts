import { Router } from "express";

import authRoutes from "./authRoutes";
import codeRoutes from "./codeRoutes";
import healthRouter from "./health-route";
import problemRoutes from "./problemRoutes";

const indexRoutes = Router();

indexRoutes.use("/auth", authRoutes);
indexRoutes.use("/code", codeRoutes);
indexRoutes.use("/health", healthRouter);
indexRoutes.use("/problem", problemRoutes);

export default indexRoutes;
