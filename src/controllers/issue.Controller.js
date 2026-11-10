import { respondToUseCaseError } from "./controllerError.js";
import {
  createIssue as createIssueUseCase,
  deleteIssue as deleteIssueUseCase,
  getIssue as getIssueUseCase,
  getSectionIssues as getSectionIssuesUseCase,
  updateIssue as updateIssueUseCase,
} from "../usecases/issue.usecase.js";

export const createIssue = async (req, res) => {
  try {
    const issue = await createIssueUseCase({
      ...req.body,
      userId: req.userId,
    });
    return res.status(201).json({ success: true, data: issue });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to create issue", {
      includeSuccess: true,
    });
  }
};

export const getIssue = async (req, res) => {
  try {
    const issue = await getIssueUseCase({
      userId: req.userId,
      issueId: req.params.issueId,
    });
    return res.status(200).json({ success: true, data: issue });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to fetch issue", {
      includeSuccess: true,
    });
  }
};

export const getSectionIssues = async (req, res) => {
  try {
    const issues = await getSectionIssuesUseCase({
      userId: req.userId,
      sectionId: req.params.sectionId,
    });
    return res.status(200).json({ success: true, data: issues });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to fetch section issues", {
      includeSuccess: true,
    });
  }
};

export const updateIssue = async (req, res) => {
  try {
    const issue = await updateIssueUseCase({
      ...req.body,
      userId: req.userId,
      issueId: req.params.issueId,
    });
    return res.status(200).json({ success: true, data: issue });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to update issue", {
      includeSuccess: true,
    });
  }
};

export const deleteIssue = async (req, res) => {
  try {
    const issue = await deleteIssueUseCase({
      userId: req.userId,
      issueId: req.params.issueId,
    });
    return res.status(200).json({
      success: true,
      message: "Issue and related comments deleted successfully",
      data: issue,
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to delete issue", {
      includeSuccess: true,
    });
  }
};
