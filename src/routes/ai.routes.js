import express from "express";
import { chatWithBoard } from "../controllers/ai.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const aiRouter = express.Router();

aiRouter.post("/boards/:boardId/chat", authenticate, chatWithBoard);
