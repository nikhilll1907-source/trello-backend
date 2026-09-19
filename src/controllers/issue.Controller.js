import mongoose from "mongoose";
import Board from "../models/board.model.js";
import Section from "../models/section.model.js";
import Issue from "../models/issue.model.js";
import Comment from "../models/comment.model.js";
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

export const createIssue = async (req, res) => {
  try {
    const { title, description, boardId, sectionId } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid board id",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section id",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Issue title is required",
      });
    }

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    if (section.boardId.toString() !== board._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Section does not belong to this board",
      });
    }

    const isActiveAdmin = await hasActiveAdminMembership(userId, board.organizationId);
    if (!isActiveAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only active admins can create issues",
      });
    }

    const issue = await Issue.create({
      title: title.trim(),
      description: description?.trim() || "",
      boardId,
      sectionId,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      data: issue,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create issue",
      error: error.message,
    });
  }
};

export const getIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue id",
      });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const board = await Board.findById(issue.boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const isActiveMember = await hasActiveMembership(userId, board.organizationId);
    if (!isActiveMember) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this issue",
      });
    }

    return res.status(200).json({
      success: true,
      data: issue,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch issue",
      error: error.message,
    });
  }
};

export const getSectionIssues = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section id",
      });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    const board = await Board.findById(section.boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const isActiveMember = await hasActiveMembership(userId, board.organizationId);
    if (!isActiveMember) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to these issues",
      });
    }

    const issues = await Issue.find({ sectionId }).sort({ position: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: issues,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch section issues",
      error: error.message,
    });
  }
};

export const updateIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { title, description, sectionId } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue id",
      });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const board = await Board.findById(issue.boardId);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const isActiveAdmin = await hasActiveAdminMembership(userId, board.organizationId);
    if (!isActiveAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only active admins can update issues",
      });
    }

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Issue title cannot be empty",
        });
      }
      issue.title = title.trim();
    }

    if (description !== undefined) {
      issue.description = description.trim();
    }

    if (sectionId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(sectionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid section id",
        });
      }

      const newSection = await Section.findById(sectionId);
      if (!newSection) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      if (newSection.boardId.toString() !== issue.boardId.toString()) {
        return res.status(400).json({
          success: false,
          message: "Section does not belong to this board",
        });
      }

      issue.sectionId = sectionId;
    }

    await issue.save();

    return res.status(200).json({
      success: true,
      data: issue,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update issue",
      error: error.message,
    });
  }
};

export const deleteIssue = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { issueId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue id",
      });
    }

    const issue = await Issue.findById(issueId).session(session);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    const board = await Board.findById(issue.boardId).session(session);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const isActiveAdmin = await hasActiveAdminMembership(userId, board.organizationId);
    if (!isActiveAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only active admins can delete issues",
      });
    }

    await session.withTransaction(async () => {
      await Comment.deleteMany({ issueId: issue._id }).session(session);
      await Issue.deleteOne({ _id: issue._id }).session(session);
    });

    return res.status(200).json({
      success: true,
      message: "Issue and related comments deleted successfully",
      data: issue,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete issue",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};
