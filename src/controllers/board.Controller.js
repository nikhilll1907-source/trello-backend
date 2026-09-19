import mongoose from "mongoose";
import Board from "../models/board.model.js";
import Section from "../models/section.model.js";
import Issue from "../models/issue.model.js";
import Comment from "../models/comment.model.js";
import Membership from "../models/membership.model.js";

const hasActiveAdminAccess = async (userId, organizationId) => {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    role: "ADMIN",
    status: "ACTIVE",
  });

  return !!membership;
};

const hasActiveMembership = async (userId, organizationId) => {
  const membership = await Membership.findOne({
    userId,
    organizationId,
    status: "ACTIVE",
  });

  return !!membership;
};

export const createBoard = async (req, res) => {
  try {
    const { title, description, organizationId } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization id",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Board title is required",
      });
    }

    const isAdmin = await hasActiveAdminAccess(userId, organizationId);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only active admins can create boards",
      });
    }

    const board = await Board.create({
      title: title.trim(),
      description: description?.trim() || "",
      organizationId,
    });

    return res.status(201).json({
      success: true,
      data: board,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create board",
      error: error.message,
    });
  }
};

export const getBoards = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization id",
      });
    }

    const isActiveMember = await hasActiveMembership(userId, organizationId);
    if (!isActiveMember) {
      return res.status(403).json({
        success: false,
        message: "You must be an active member of this organization to view boards",
      });
    }

    const boards = await Board.find({ organizationId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: boards,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch boards",
      error: error.message,
    });
  }
};

export const getBoardById = async (req, res) => {
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
        message: "You must be an active member of this organization to view this board",
      });
    }

    return res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch board",
      error: error.message,
    });
  }
};

export const updateBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, description } = req.body;
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

    const isActiveAdmin = await hasActiveAdminAccess(userId, board.organizationId);
    if (!isActiveAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only active admins can update boards",
      });
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Board title cannot be empty",
        });
      }
      board.title = title.trim();
    }

    if (description !== undefined) {
      board.description = description.trim();
    }

    await board.save();

    return res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update board",
      error: error.message,
    });
  }
};

export const deleteBoard = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { boardId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(boardId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid board id",
      });
    }

    const board = await Board.findById(boardId).session(session);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const isActiveAdmin = await hasActiveAdminAccess(
      userId,
      board.organizationId
    );

    if (!isActiveAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only active admins can delete boards",
      });
    }

    await session.withTransaction(async () => {

      // 1. Find all sections belonging to this board
      const sections = await Section.find({
        boardId: boardId,
      })
        .select("_id")
        .session(session);

      const sectionIds = sections.map((section) => section._id);

      // 2. Find all issues belonging to those sections
      const issues = await Issue.find({
        sectionId: { $in: sectionIds },
      })
        .select("_id")
        .session(session);

      const issueIds = issues.map((issue) => issue._id);

      // 3. Delete comments belonging to those issues
      if (issueIds.length > 0) {
        await Comment.deleteMany({
          issueId: { $in: issueIds },
        }).session(session);
      }

      // 4. Delete issues
      if (sectionIds.length > 0) {
        await Issue.deleteMany({
          sectionId: { $in: sectionIds },
        }).session(session);
      }

      // 5. Delete sections
      await Section.deleteMany({
        boardId: boardId,
      }).session(session);

      // 6. Delete board
      await Board.deleteOne({
        _id: boardId,
      }).session(session);
    });

    return res.status(200).json({
      success: true,
      message: "Board and all related data deleted successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete board",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};