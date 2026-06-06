import { Router } from "express";
import healthRouter from "./health-route";
import codeRoutes from "./codeRoutes";
import authRoutes from "./authRoutes";

const indexRoutes = Router();

indexRoutes.use("/auth", authRoutes);
indexRoutes.use("/code", codeRoutes);
indexRoutes.use("/health", healthRouter);

export default indexRoutes;
