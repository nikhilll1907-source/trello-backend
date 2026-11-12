import express from "express";
import {
  chatWithBoard,
  getBoardConversation,
} from "../controllers/ai.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const aiRouter = express.Router();

aiRouter.get(
  "/boards/:boardId/conversation",
  authenticate,
  getBoardConversation
);
aiRouter.post("/boards/:boardId/chat", authenticate, chatWithBoard);
