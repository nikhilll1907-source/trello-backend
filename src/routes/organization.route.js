import express from "express";
import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizations,
} from "../controllers/organization.Controller.js";

export const organizationRoute = express.Router();
import {authenticate} from "../middleware/auth.middleware.js"

organizationRoute.post("/",authenticate, createOrganization);
organizationRoute.get("/",authenticate, getOrganizations);
organizationRoute.get("/:organizationId",authenticate, getOrganizationById);
organizationRoute.put("/:organizationId",authenticate, updateOrganization);
organizationRoute.delete("/:organizationId",authenticate, deleteOrganization);

