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

const getIssueBoard = async (issue) => {
  const board = await Board.findById(issue.boardId);
  if (!board) {
    throw new UseCaseError("Board not found", 404);
  }
  return board;
};

export const createIssue = async ({
  userId,
  title,
  description,
  boardId,
  sectionId,
}) => {
  validateObjectId(boardId, "board");
  validateObjectId(sectionId, "section");

  if (typeof title !== "string" || !title.trim()) {
    throw new UseCaseError("Issue title is required", 400);
  }
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    throw new UseCaseError("Issue description must be a string", 400);
  }

  const board = await Board.findById(boardId);
  if (!board) {
    throw new UseCaseError("Board not found", 404);
  }

  const section = await Section.findById(sectionId);
  if (!section) {
    throw new UseCaseError("Section not found", 404);
  }

  if (section.boardId.toString() !== board._id.toString()) {
    throw new UseCaseError("Section does not belong to this board", 400);
  }

  await requireActiveAdminMembership(
    userId,
    board.organizationId,
    "Only active admins can create issues"
  );

  return Issue.create({
    title: title.trim(),
    description:
      typeof description === "string" ? description.trim() || "" : "",
    boardId,
    sectionId,
    createdBy: userId,
  });
};

export const getIssue = async ({ userId, issueId }) => {
  validateObjectId(issueId, "issue");
  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw new UseCaseError("Issue not found", 404);
  }

  const board = await getIssueBoard(issue);
  await requireActiveMembership(
    userId,
    board.organizationId,
    "You do not have access to this issue"
  );

  return issue;
};

export const getSectionIssues = async ({ userId, sectionId }) => {
  validateObjectId(sectionId, "section");

  const section = await Section.findById(sectionId);
  if (!section) {
    throw new UseCaseError("Section not found", 404);
  }

  const board = await Board.findById(section.boardId);
  if (!board) {
    throw new UseCaseError("Board not found", 404);
  }

  await requireActiveMembership(
    userId,
    board.organizationId,
    "You do not have access to these issues"
  );

  return Issue.find({ sectionId }).sort({ position: 1, createdAt: 1 });
};

export const updateIssue = async ({
  userId,
  issueId,
  title,
  description,
  sectionId,
}) => {
  validateObjectId(issueId, "issue");

  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw new UseCaseError("Issue not found", 404);
  }

  const board = await getIssueBoard(issue);
  await requireActiveAdminMembership(
    userId,
    board.organizationId,
    "Only active admins can update issues"
  );

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      throw new UseCaseError("Issue title cannot be empty", 400);
    }
    issue.title = title.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      throw new UseCaseError("Issue description must be a string", 400);
    }
    issue.description = description.trim();
  }

  if (sectionId !== undefined) {
    validateObjectId(sectionId, "section");
    const newSection = await Section.findById(sectionId);
    if (!newSection) {
      throw new UseCaseError("Section not found", 404);
    }

    if (newSection.boardId.toString() !== issue.boardId.toString()) {
      throw new UseCaseError("Section does not belong to this board", 400);
    }

    issue.sectionId = sectionId;
  }

  await issue.save();
  return issue;
};

export const deleteIssue = async ({ userId, issueId }) => {
  validateObjectId(issueId, "issue");
  const session = await mongoose.startSession();

  try {
    const issue = await Issue.findById(issueId).session(session);
    if (!issue) {
      throw new UseCaseError("Issue not found", 404);
    }

    const board = await Board.findById(issue.boardId).session(session);
    if (!board) {
      throw new UseCaseError("Board not found", 404);
    }

    await requireActiveAdminMembership(
      userId,
      board.organizationId,
      "Only active admins can delete issues"
    );

    await session.withTransaction(async () => {
      await Comment.deleteMany({ issueId: issue._id }).session(session);
      await Issue.deleteOne({ _id: issue._id }).session(session);
    });

    return issue;
  } finally {
    await session.endSession();
  }
};
