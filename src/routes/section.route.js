import express from "express";
import {
  createSection,
  getSection,
  getBoardSections,
  updateSection,
  deleteSection,
} from "../controllers/section.Controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

export const sectionRoute = express.Router();

sectionRoute.post("/", authenticate, createSection);
sectionRoute.get("/board/:boardId", authenticate, getBoardSections);
sectionRoute.get("/:sectionId", authenticate, getSection);
sectionRoute.patch("/:sectionId", authenticate, updateSection);
sectionRoute.delete("/:sectionId", authenticate, deleteSection);
