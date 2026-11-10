import { respondToUseCaseError } from "./controllerError.js";
import {
  createComment as createCommentUseCase,
  deleteComment as deleteCommentUseCase,
  getComment as getCommentUseCase,
  getIssueComments as getIssueCommentsUseCase,
  updateComment as updateCommentUseCase,
} from "../usecases/comment.usecase.js";

export const createComment = async (req, res) => {
  try {
    const comment = await createCommentUseCase({
      userId: req.userId,
      content: req.body.content,
      issueId: req.body.issueId,
      bodyUserId: req.body.userId,
    });
    return res.status(201).json({ success: true, data: comment });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to create comment", {
      includeSuccess: true,
      includeError: true,
    });
  }
};

export const getComment = async (req, res) => {
  try {
    const comment = await getCommentUseCase({
      userId: req.userId,
      commentId: req.params.commentId,
    });
    return res.status(200).json({ success: true, data: comment });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to fetch comment", {
      includeSuccess: true,
      includeError: true,
    });
  }
};

export const getIssueComments = async (req, res) => {
  try {
    const comments = await getIssueCommentsUseCase({
      userId: req.userId,
      issueId: req.params.issueId,
    });
    return res.status(200).json({ success: true, data: comments });
  } catch (error) {
    return respondToUseCaseError(
      res,
      error,
      "Failed to fetch issue comments",
      { includeSuccess: true, includeError: true }
    );
  }
};

export const updateComment = async (req, res) => {
  try {
    const comment = await updateCommentUseCase({
      userId: req.userId,
      commentId: req.params.commentId,
      content: req.body.content,
      bodyUserId: req.body.userId,
      bodyIssueId: req.body.issueId,
    });
    return res.status(200).json({ success: true, data: comment });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to update comment", {
      includeSuccess: true,
      includeError: true,
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await deleteCommentUseCase({
      userId: req.userId,
      commentId: req.params.commentId,
    });
    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: comment,
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to delete comment", {
      includeSuccess: true,
      includeError: true,
    });
  }
};
