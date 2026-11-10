import mongoose from "mongoose";
import Comment from "../models/comment.model.js";
import Issue from "../models/issue.model.js";
import Board from "../models/board.model.js";
import {
  hasActiveAdminMembership,
  requireActiveMembership,
  UseCaseError,
  validateObjectId,
} from "./usecase.helpers.js";

const normalizeCommentContent = (content) => {
  if (content === undefined || content === null) {
    throw new UseCaseError("Content is required", 400);
  }

  const trimmedContent = String(content).trim();
  if (!trimmedContent) {
    throw new UseCaseError("Content cannot be empty", 400);
  }

  return trimmedContent;
};

const getIssueAccessContext = async (userId, issueId) => {
  validateObjectId(issueId, "issue");

  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw new UseCaseError("Issue not found", 404);
  }

  const board = await Board.findById(issue.boardId);
  if (!board) {
    throw new UseCaseError("Board not found", 404);
  }

  await requireActiveMembership(
    userId,
    board.organizationId,
    "You do not have access to this issue"
  );

  return { issue, board };
};

const isCommentOwner = (userId, commentUserId) =>
  userId.toString() === commentUserId.toString();

export const createComment = async ({
  userId,
  content,
  issueId,
  bodyUserId,
}) => {
  if (bodyUserId !== undefined) {
    throw new UseCaseError("Comment creator cannot be set by the client", 400);
  }

  validateObjectId(issueId, "issue");
  const trimmedContent = normalizeCommentContent(content);
  const { issue } = await getIssueAccessContext(userId, issueId);

  return Comment.create({
    content: trimmedContent,
    issueId: issue._id,
    userId,
  });
};

export const getComment = async ({ userId, commentId }) => {
  validateObjectId(commentId, "comment");

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new UseCaseError("Comment not found", 404);
  }

  await getIssueAccessContext(userId, comment.issueId);
  return comment;
};

export const getIssueComments = async ({ userId, issueId }) => {
  const { issue } = await getIssueAccessContext(userId, issueId);
  return Comment.find({ issueId: issue._id }).sort({ createdAt: 1 });
};

export const updateComment = async ({
  userId,
  commentId,
  content,
  bodyUserId,
  bodyIssueId,
}) => {
  validateObjectId(commentId, "comment");

  if (bodyUserId !== undefined || bodyIssueId !== undefined) {
    throw new UseCaseError("Updating userId or issueId is not allowed", 400);
  }

  if (content === undefined) {
    throw new UseCaseError("Comment content is required", 400);
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new UseCaseError("Comment not found", 404);
  }

  await getIssueAccessContext(userId, comment.issueId);
  if (!isCommentOwner(userId, comment.userId)) {
    throw new UseCaseError("You can only update your own comments", 403);
  }

  comment.content = normalizeCommentContent(content);
  await comment.save();
  return comment;
};

export const deleteComment = async ({ userId, commentId }) => {
  validateObjectId(commentId, "comment");

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new UseCaseError("Comment not found", 404);
  }

  const { board } = await getIssueAccessContext(userId, comment.issueId);
  const owner = isCommentOwner(userId, comment.userId);

  const isActiveAdmin = await hasActiveAdminMembership(
    userId,
    board.organizationId
  );

  if (!owner && !isActiveAdmin) {
    throw new UseCaseError("You can only delete your own comments", 403);
  }

  await Comment.deleteOne({ _id: comment._id });
  return comment;
};
