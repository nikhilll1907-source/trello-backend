import express from "express";
import {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
} from "../controllers/board.Controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const boardRouter = express.Router();

boardRouter.post("/", authenticate, createBoard);
boardRouter.get("/organization/:organizationId", authenticate, getBoards);
boardRouter.get("/:boardId", authenticate, getBoardById);
boardRouter.put("/:boardId", authenticate, updateBoard);
boardRouter.delete("/:boardId", authenticate, deleteBoard);
