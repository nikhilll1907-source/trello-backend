import mongoose from "mongoose";
import Organization from "../models/organization.model.js";
import Membership from "../models/membership.model.js";
import Board from "../models/board.model.js";
import Section from "../models/section.model.js";
import Issue from "../models/issue.model.js";
import Comment from "../models/comment.model.js";
import {
  requireActiveAdminMembership,
  requireActiveMembership,
  UseCaseError,
  validateObjectId,
} from "./usecase.helpers.js";

const isTransactionUnsupported = (error) =>
  error?.code === 20 || error?.codeName === "IllegalOperation";

export const createOrganization = async ({ userId, name, description }) => {
  if (typeof name !== "string" || !name.trim()) {
    throw new UseCaseError("Organization name is required", 400);
  }
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    throw new UseCaseError("Organization description must be a string", 400);
  }

  const organizationData = {
    name: name.trim(),
    description:
      typeof description === "string" ? description.trim() || "" : "",
  };
  let organization;
  let session;

  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      [organization] = await Organization.create([organizationData], { session });
      await Membership.create(
        [
          {
            userId,
            organizationId: organization._id,
            role: "ADMIN",
            status: "ACTIVE",
          },
        ],
        { session }
      );
    });
  } catch (error) {
    if (!isTransactionUnsupported(error)) {
      throw error;
    }

    organization = await Organization.create(organizationData);
    await Membership.create({
      userId,
      organizationId: organization._id,
      role: "ADMIN",
      status: "ACTIVE",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }

  return organization;
};

export const getOrganizations = async ({ userId }) => {
  const memberships = await Membership.find({
    userId,
    status: "ACTIVE",
  })
    .select("organizationId")
    .lean();

  const organizationIds = memberships.map(
    (membership) => membership.organizationId
  );

  return Organization.find({ _id: { $in: organizationIds } }).sort({
    createdAt: -1,
  });
};

export const getOrganizationById = async ({ userId, organizationId }) => {
  validateObjectId(organizationId, "organization");
  await requireActiveMembership(
    userId,
    organizationId,
    "You must be an active member of this organization"
  );

  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new UseCaseError("Organization not found", 404);
  }

  return organization;
};

export const updateOrganization = async ({
  userId,
  organizationId,
  name,
  description,
}) => {
  validateObjectId(organizationId, "organization");
  await requireActiveAdminMembership(
    userId,
    organizationId,
    "Only active organization admins can update this organization"
  );

  const updateData = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new UseCaseError("Organization name cannot be empty", 400);
    }
    updateData.name = name.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      throw new UseCaseError("Organization description must be a string", 400);
    }
    updateData.description = description.trim();
  }

  const organization = await Organization.findByIdAndUpdate(
    organizationId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!organization) {
    throw new UseCaseError("Organization not found", 404);
  }

  return organization;
};

export const deleteOrganization = async ({ userId, organizationId }) => {
  validateObjectId(organizationId, "organization");
  const session = await mongoose.startSession();

  try {
    const membership = await Membership.findOne({
      userId,
      organizationId,
      role: "ADMIN",
      status: "ACTIVE",
    }).session(session);

    if (!membership) {
      throw new UseCaseError(
        "Only active organization admins can delete this organization",
        403
      );
    }

    const organization = await Organization.findById(organizationId).session(
      session
    );
    if (!organization) {
      throw new UseCaseError("Organization not found", 404);
    }

    await session.withTransaction(async () => {
      const boards = await Board.find({ organizationId })
        .select("_id")
        .session(session);
      const boardIds = boards.map((board) => board._id);

      const sections = await Section.find({ boardId: { $in: boardIds } })
        .select("_id")
        .session(session);
      const sectionIds = sections.map((section) => section._id);

      const issues = await Issue.find({ sectionId: { $in: sectionIds } })
        .select("_id")
        .session(session);
      const issueIds = issues.map((issue) => issue._id);

      if (issueIds.length > 0) {
        await Comment.deleteMany({ issueId: { $in: issueIds } }).session(
          session
        );
      }

      if (sectionIds.length > 0) {
        await Issue.deleteMany({ sectionId: { $in: sectionIds } }).session(
          session
        );
      }

      if (boardIds.length > 0) {
        await Section.deleteMany({ boardId: { $in: boardIds } }).session(
          session
        );
      }

      await Board.deleteMany({ organizationId }).session(session);
      await Membership.deleteMany({ organizationId }).session(session);
      await Organization.deleteOne({ _id: organizationId }).session(session);
    });
  } finally {
    await session.endSession();
  }
};
