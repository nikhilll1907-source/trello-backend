import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  inviteMember,
  getOrganizationMembers,
  updateMembership,
  deleteMembership,
  acceptInvitation,
} from "../controllers/membership.controllers.js";

export const membershipRoute = express.Router();

membershipRoute.post("/invite", authenticate, inviteMember);
membershipRoute.get("/organizations/:organizationId/members", authenticate, getOrganizationMembers);
membershipRoute.put("/:membershipId", authenticate, updateMembership);
membershipRoute.delete("/:membershipId", authenticate, deleteMembership);
membershipRoute.put("/:membershipId/accept", authenticate, acceptInvitation);
