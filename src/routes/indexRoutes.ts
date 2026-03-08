import { Router } from "express";
import healthRouter from "./health-route";



const indexRoutes = Router();

indexRoutes.use("/health", healthRouter);


export default indexRoutes;