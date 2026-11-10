import mongoose from "mongoose";
import Membership from "../models/membership.model.js";
import User from "../models/user.model.js";
import Organization from "../models/organization.model.js";
import { getOrganizationInviteHtml } from "../services/getHtml/organizationInvite.html.js";
import { sendEmail } from "../services/nodemailer.helper.js";
import { UseCaseError, validateObjectId } from "./usecase.helpers.js";

const requireOrganizationAdmin = async (userId, organizationId, message) => {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    role: "ADMIN",
  });

  if (!membership) {
    throw new UseCaseError(message, 403);
  }
};

const sendOrganizationInviteEmail = async (
  email,
  organizationName,
  inviterName,
  membershipId
) =>
  sendEmail(
    email,
    `Invitation to join ${organizationName}`,
    `You have been invited to join ${organizationName}. Your membership ID is ${membershipId}.`,
    getOrganizationInviteHtml(organizationName, inviterName, membershipId)
  );

export const inviteMember = async ({
  currentUserId,
  organizationId,
  role = "MEMBER",
  email,
  targetUserId,
}) => {
  validateObjectId(organizationId, "organization");

  if (!targetUserId && email) {
    const foundUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!foundUser) {
      throw new UseCaseError(
        `User with email ${email} not found. Please ask them to register first.`,
        404
      );
    }

    targetUserId = foundUser._id;
  }

  if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new UseCaseError("Invalid user id or email", 400);
  }

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new UseCaseError("Organization not found", 404);
  }

  await requireOrganizationAdmin(
    currentUserId,
    organizationId,
    "Only organization admins can invite members"
  );

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new UseCaseError("User not found", 404);
  }

  if (role !== "MEMBER" && role !== "ADMIN") {
    throw new UseCaseError("Role must be either MEMBER or ADMIN", 400);
  }

  const existingMembership = await Membership.findOne({
    userId: targetUserId,
    organizationId,
  });

  if (existingMembership) {
    throw new UseCaseError(
      "User is already a member of this organization",
      409
    );
  }

  const membership = await Membership.create({
    userId: targetUserId,
    organizationId,
    role,
    status: "PENDING",
  });

  const currentUser = await User.findById(currentUserId);
  if (!currentUser) {
    throw new UseCaseError("Current user not found", 404);
  }

  await sendOrganizationInviteEmail(
    targetUser.email,
    organization.name,
    currentUser.name,
    membership._id
  );

  return membership;
};

export const getOrganizationMembers = async ({
  userId,
  organizationId,
  status,
}) => {
  validateObjectId(organizationId, "organization");
  const activeMembership = await Membership.findOne({
    userId,
    organizationId,
    status: "ACTIVE",
  });

  if (!activeMembership) {
    throw new UseCaseError(
      "You must be an active member of this organization",
      403
    );
  }

  const statusFilter = status ? { status } : {};
  return Membership.find({ organizationId, ...statusFilter })
    .populate("userId", "name email")
    .populate("organizationId", "name")
    .sort({ createdAt: -1 });
};

export const updateMembership = async ({
  currentUserId,
  membershipId,
  role,
}) => {
  validateObjectId(membershipId, "membership");

  if (!role || (role !== "ADMIN" && role !== "MEMBER")) {
    throw new UseCaseError("Role must be ADMIN or MEMBER", 400);
  }

  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw new UseCaseError("Membership not found", 404);
  }

  await requireOrganizationAdmin(
    currentUserId,
    membership.organizationId,
    "Only organization admins can update memberships"
  );

  if (membership.role === "ADMIN" && role === "MEMBER") {
    const adminCount = await Membership.countDocuments({
      organizationId: membership.organizationId,
      role: "ADMIN",
      status: "ACTIVE",
    });

    if (adminCount < 2) {
      throw new UseCaseError(
        "At least 2 admins must remain in the organization",
        400
      );
    }
  }

  membership.role = role;
  await membership.save();
  return membership;
};

export const acceptInvitation = async ({ userId, membershipId }) => {
  validateObjectId(membershipId, "membership");

  const membership = await Membership.findOne({
    _id: membershipId,
    userId,
    status: "PENDING",
  });

  if (!membership) {
    throw new UseCaseError("Pending invitation not found", 404);
  }

  membership.status = "ACTIVE";
  await membership.save();
  return membership;
};

export const deleteMembership = async ({ currentUserId, membershipId }) => {
  validateObjectId(membershipId, "membership");

  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw new UseCaseError("Membership not found", 404);
  }

  await requireOrganizationAdmin(
    currentUserId,
    membership.organizationId,
    "Only organization admins can remove members"
  );

  if (membership.role === "ADMIN" && membership.status === "ACTIVE") {
    const adminCount = await Membership.countDocuments({
      organizationId: membership.organizationId,
      role: "ADMIN",
      status: "ACTIVE",
    });

    if (adminCount < 2) {
      throw new UseCaseError(
        "At least 2 admins must remain in the organization",
        400
      );
    }
  }

  await membership.deleteOne();
  return membership;
};
