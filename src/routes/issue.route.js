import express from "express";
import {
  createIssue,
  getIssue,
  getSectionIssues,
  updateIssue,
  deleteIssue,
} from "../controllers/issue.Controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const issueRoute = express.Router();

issueRoute.post("/", authenticate, createIssue);
issueRoute.get("/section/:sectionId", authenticate, getSectionIssues);
issueRoute.get("/:issueId", authenticate, getIssue);
issueRoute.patch("/:issueId", authenticate, updateIssue);
issueRoute.delete("/:issueId", authenticate, deleteIssue);
