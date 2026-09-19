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

export const createSection = async (req, res) => {
  try {
    const { boardId, name } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid board id",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Section name is required",
      });
    }

    const board = await Board.findById(boardId);
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
        message: "Only active admins can create sections",
      });
    }

    const section = await Section.create({
      name: name.trim(),
      boardId,
      position: 0,
    });

    return res.status(201).json({
      success: true,
      data: section,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create section",
      error: error.message,
    });
  }
};

export const getSection = async (req, res) => {
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
        message: "You do not have access to this section",
      });
    }

    return res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch section",
      error: error.message,
    });
  }
};

export const getBoardSections = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid board id",
      });
    }

    const board = await Board.findById(boardId);
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
        message: "You do not have access to this board",
      });
    }

    const sections = await Section.find({ boardId }).sort({ position: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: sections,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch board sections",
      error: error.message,
    });
  }
};

export const updateSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { name } = req.body;
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

    const isActiveAdmin = await hasActiveAdminMembership(userId, board.organizationId);
    if (!isActiveAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only active admins can update sections",
      });
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Section name cannot be empty",
        });
      }
      section.name = name.trim();
    }

    await section.save();

    return res.status(200).json({
      success: true,
      data: section,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update section",
      error: error.message,
    });
  }
};

export const deleteSection = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { sectionId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section id",
      });
    }

    const section = await Section.findById(sectionId).session(session);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    const board = await Board.findById(section.boardId).session(session);
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
        message: "Only active admins can delete sections",
      });
    }

    await session.withTransaction(async () => {
      const issues = await Issue.find({ sectionId: section._id })
        .select("_id")
        .session(session);

      const issueIds = issues.map((issue) => issue._id);

      if (issueIds.length > 0) {
        await Comment.deleteMany({ issueId: { $in: issueIds } }).session(session);
        await Issue.deleteMany({ _id: { $in: issueIds } }).session(session);
      }

      await Section.deleteOne({ _id: section._id }).session(session);
    });

    return res.status(200).json({
      success: true,
      message: "Section deleted successfully",
      data: section,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete section",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};
