import express from "express";
import {
  createComment,
  getComment,
  getIssueComments,
  updateComment,
  deleteComment,
} from "../controllers/comment.Controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const commentRoute = express.Router();

commentRoute.post("/", authenticate, createComment);
commentRoute.get("/issue/:issueId", authenticate, getIssueComments);
commentRoute.get("/:commentId", authenticate, getComment);
commentRoute.patch("/:commentId", authenticate, updateComment);
commentRoute.delete("/:commentId", authenticate, deleteComment);
