import express from "express";
import {
  approveAIActionController,
  getAIActionByIdController,
  getPendingAIActionsController,
  rejectAIActionController,
} from "../controllers/aiAction.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const aiActionRouter = express.Router({ mergeParams: true });

aiActionRouter.get("/pending", authenticate, getPendingAIActionsController);
aiActionRouter.get("/:actionId", authenticate, getAIActionByIdController);
aiActionRouter.post("/:actionId/approve",authenticate,approveAIActionController);
aiActionRouter.post("/:actionId/reject",authenticate,rejectAIActionController);
