import mongoose from "mongoose";
import Comment from "../models/comment.model.js";
import Issue from "../models/issue.model.js";
import Board from "../models/board.model.js";
import Membership from "../models/membership.model.js";

const hasActiveMembership = async (userId, organizationId) => {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    status: "ACTIVE",
  });

  return !!membership;
};

const hasActiveAdminMembership = async (userId, organizationId) => {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    role: "ADMIN",
    status: "ACTIVE",
  });

  return !!membership;
};

export const normalizeCommentContent = (content) => {
  if (content === undefined || content === null) {
    const error = new Error("Content is required");
    error.statusCode = 400;
    throw error;
  }

  const trimmedContent = String(content).trim();

  if (!trimmedContent) {
    const error = new Error("Content cannot be empty");
    error.statusCode = 400;
    throw error;
  }

  return trimmedContent;
};

export const canManageOwnComment = ({ userId, commentUserId }) => {
  return userId.toString() === commentUserId.toString();
};

const getIssueAccessContext = async (userId, issueId) => {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    const error = new Error("Invalid issue id");
    error.statusCode = 400;
    throw error;
  }

  const issue = await Issue.findById(issueId);
  if (!issue) {
    const error = new Error("Issue not found");
    error.statusCode = 404;
    throw error;
  }

  const board = await Board.findById(issue.boardId);
  if (!board) {
    const error = new Error("Board not found");
    error.statusCode = 404;
    throw error;
  }

  const isActiveMember = await hasActiveMembership(userId, board.organizationId);
  if (!isActiveMember) {
    const error = new Error("You do not have access to this issue");
    error.statusCode = 403;
    throw error;
  }

  return { issue, board };
};

export const createComment = async (req, res) => {
  try {
    const { content, issueId, userId: bodyUserId } = req.body;
    const userId = req.userId;

    if (bodyUserId !== undefined) {
      return res.status(400).json({
        success: false,
        message: "Comment creator cannot be set by the client",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue id",
      });
    }

    const trimmedContent = normalizeCommentContent(content);

    const { issue } = await getIssueAccessContext(userId, issueId);

    const comment = await Comment.create({
      content: trimmedContent,
      issueId: issue._id,
      userId,
    });

    return res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create comment",
      error: error.message,
    });
  }
};

export const getComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment id",
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    await getIssueAccessContext(userId, comment.issueId);

    return res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch comment",
      error: error.message,
    });
  }
};

export const getIssueComments = async (req, res) => {
  try {
    const { issueId } = req.params;
    const userId = req.userId;

    const { issue } = await getIssueAccessContext(userId, issueId);

    const comments = await Comment.find({ issueId: issue._id }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch issue comments",
      error: error.message,
    });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, userId: bodyUserId, issueId: bodyIssueId } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment id",
      });
    }

    if (bodyUserId !== undefined || bodyIssueId !== undefined) {
      return res.status(400).json({
        success: false,
        message: "Updating userId or issueId is not allowed",
      });
    }

    if (content === undefined) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    await getIssueAccessContext(userId, comment.issueId);
    const isCommentOwner = canManageOwnComment({ userId, commentUserId: comment.userId });

    if (!isCommentOwner) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own comments",
      });
    }

    const trimmedContent = normalizeCommentContent(content);
    comment.content = trimmedContent;
    await comment.save();

    return res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update comment",
      error: error.message,
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment id",
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const { board } = await getIssueAccessContext(userId, comment.issueId);
    const isActiveAdmin = await hasActiveAdminMembership(userId, board.organizationId);
    const isCommentOwner = canManageOwnComment({ userId, commentUserId: comment.userId });

    if (!isCommentOwner && !isActiveAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments",
      });
    }

    await Comment.deleteOne({ _id: comment._id });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: comment,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete comment",
      error: error.message,
    });
  }
};
