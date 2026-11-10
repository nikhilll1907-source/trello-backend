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

const getSectionBoard = async (sectionId, session) => {
  const sectionQuery = Section.findById(sectionId);
  const section = session ? await sectionQuery.session(session) : await sectionQuery;
  if (!section) {
    throw new UseCaseError("Section not found", 404);
  }

  const boardQuery = Board.findById(section.boardId);
  const board = session ? await boardQuery.session(session) : await boardQuery;
  if (!board) {
    throw new UseCaseError("Board not found", 404);
  }

  return { section, board };
};

export const createSection = async ({ userId, boardId, name }) => {
  validateObjectId(boardId, "board");
  if (typeof name !== "string" || !name.trim()) {
    throw new UseCaseError("Section name is required", 400);
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throw new UseCaseError("Board not found", 404);
  }

  await requireActiveAdminMembership(
    userId,
    board.organizationId,
    "Only active admins can create sections"
  );

  return Section.create({ name: name.trim(), boardId, position: 0 });
};

export const getSection = async ({ userId, sectionId }) => {
  validateObjectId(sectionId, "section");
  const { section, board } = await getSectionBoard(sectionId);

  await requireActiveMembership(
    userId,
    board.organizationId,
    "You do not have access to this section"
  );

  return section;
};

export const getBoardSections = async ({ userId, boardId }) => {
  validateObjectId(boardId, "board");
  const board = await Board.findById(boardId);
  if (!board) {
    throw new UseCaseError("Board not found", 404);
  }

  await requireActiveMembership(
    userId,
    board.organizationId,
    "You do not have access to this board"
  );

  return Section.find({ boardId }).sort({ position: 1, createdAt: 1 });
};

export const updateSection = async ({ userId, sectionId, name }) => {
  validateObjectId(sectionId, "section");
  const { section, board } = await getSectionBoard(sectionId);

  await requireActiveAdminMembership(
    userId,
    board.organizationId,
    "Only active admins can update sections"
  );

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new UseCaseError("Section name cannot be empty", 400);
    }
    section.name = name.trim();
  }

  await section.save();
  return section;
};

export const deleteSection = async ({ userId, sectionId }) => {
  validateObjectId(sectionId, "section");
  const session = await mongoose.startSession();

  try {
    const { section, board } = await getSectionBoard(sectionId, session);

    await requireActiveAdminMembership(
      userId,
      board.organizationId,
      "Only active admins can delete sections"
    );

    await session.withTransaction(async () => {
      const issues = await Issue.find({ sectionId: section._id })
        .select("_id")
        .session(session);
      const issueIds = issues.map((issue) => issue._id);

      if (issueIds.length > 0) {
        await Comment.deleteMany({ issueId: { $in: issueIds } }).session(
          session
        );
        await Issue.deleteMany({ _id: { $in: issueIds } }).session(session);
      }

      await Section.deleteOne({ _id: section._id }).session(session);
    });

    return section;
  } finally {
    await session.endSession();
  }
};
