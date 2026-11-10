import mongoose from "mongoose";
import Membership from "../models/membership.model.js";

export class UseCaseError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "UseCaseError";
    this.statusCode = statusCode;
  }
}

export const validateObjectId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new UseCaseError(`Invalid ${label} id`, 400);
  }
};

export const requireActiveMembership = async (
  userId,
  organizationId,
  message = "You must be an active member of this organization"
) => {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    status: "ACTIVE",
  });

  if (!membership) {
    throw new UseCaseError(message, 403);
  }

  return membership;
};

export const requireActiveAdminMembership = async (
  userId,
  organizationId,
  message = "Only active admins can perform this action"
) => {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    role: "ADMIN",
    status: "ACTIVE",
  });

  if (!membership) {
    throw new UseCaseError(message, 403);
  }

  return membership;
};

export const hasActiveAdminMembership = async (userId, organizationId) =>
  Boolean(
    await Membership.findOne({
      userId,
      organizationId,
      role: "ADMIN",
      status: "ACTIVE",
    })
  );
