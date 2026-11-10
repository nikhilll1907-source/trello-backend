import mongoose from "mongoose";
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

export const createBoard = async ({
  userId,
  title,
  description,
  organizationId,
}) => {
  validateObjectId(organizationId, "organization");
  if (typeof title !== "string" || !title.trim()) {
    throw new UseCaseError("Board title is required", 400);
  }
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    throw new UseCaseError("Board description must be a string", 400);
  }

  await requireActiveAdminMembership(
    userId,
    organizationId,
    "Only active admins can create boards"
  );

  return Board.create({
    title: title.trim(),
    description:
      typeof description === "string" ? description.trim() || "" : "",
    organizationId,
  });
};

export const getBoards = async ({ userId, organizationId }) => {
  validateObjectId(organizationId, "organization");
  await requireActiveMembership(
    userId,
    organizationId,
    "You must be an active member of this organization to view boards"
  );

  return Board.find({ organizationId }).sort({ createdAt: -1 });
};

export const getBoardById = async ({ userId, boardId }) => {
  validateObjectId(boardId, "board");

  const board = await Board.findById(boardId);
  if (!board) {
    throw new UseCaseError("Board not found", 404);
  }

  await requireActiveMembership(
    userId,
    board.organizationId,
    "You must be an active member of this organization to view this board"
  );

  return board;
};

export const updateBoard = async ({
  userId,
  boardId,
  title,
  description,
}) => {
  validateObjectId(boardId, "board");

  const board = await Board.findById(boardId);
  if (!board) {
    throw new UseCaseError("Board not found", 404);
  }

  await requireActiveAdminMembership(
    userId,
    board.organizationId,
    "Only active admins can update boards"
  );

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      throw new UseCaseError("Board title cannot be empty", 400);
    }
    board.title = title.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      throw new UseCaseError("Board description must be a string", 400);
    }
    board.description = description.trim();
  }

  await board.save();
  return board;
};

export const deleteBoard = async ({ userId, boardId }) => {
  validateObjectId(boardId, "board");
  const session = await mongoose.startSession();

  try {
    const board = await Board.findById(boardId).session(session);
    if (!board) {
      throw new UseCaseError("Board not found", 404);
    }

    await requireActiveAdminMembership(
      userId,
      board.organizationId,
      "Only active admins can delete boards"
    );

    await session.withTransaction(async () => {
      const sections = await Section.find({ boardId })
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

      await Section.deleteMany({ boardId }).session(session);
      await Board.deleteOne({ _id: boardId }).session(session);
    });
  } finally {
    await session.endSession();
  }
};
