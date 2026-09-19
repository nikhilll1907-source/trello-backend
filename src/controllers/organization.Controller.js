import mongoose from "mongoose";

import Organization from "../models/organization.model.js";
import Membership from "../models/membership.model.js";
import Board from "../models/board.model.js";
import Section from "../models/section.model.js";
import Issue from "../models/issue.model.js";
import Comment from "../models/comment.model.js";

export const createOrganization = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Organization name is required",
            });
        }

        let organization;

        try {
            const session = await mongoose.startSession();
            await session.withTransaction(async () => {
                const [createdOrganization] = await Organization.create(
                    [{
                        name: name.trim(),
                        description: description?.trim() || "",
                    }],
                    { session }
                );

                organization = createdOrganization;

                await Membership.create([
                    {
                        userId: req.userId,
                        organizationId: organization._id,
                        role: "ADMIN",
                        status: "ACTIVE"
                    }
                ], { session });
            });
            await session.endSession();
        } catch (txError) {
            // Standalone MongoDB fallback
            organization = await Organization.create({
                name: name.trim(),
                description: description?.trim() || "",
            });

            await Membership.create({
                userId: req.userId,
                organizationId: organization._id,
                role: "ADMIN",
                status: "ACTIVE",
            });
        }

        return res.status(201).json({
            success: true,
            data: organization,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create organization",
            error: error.message,
        });
    }
};

export const getOrganizations = async (req, res) => {
    try {
        const userId = req.userId;

        const memberships = await Membership.find({
            userId,
            status: "ACTIVE",
        }).select("organizationId").lean();

        const organizationIds = memberships.map((membership) => membership.organizationId);

        const organizations = await Organization.find({
            _id: { $in: organizationIds },
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: organizations,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch organizations",
            error: error.message,
        });
    }
};

export const getOrganizationById = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid organization id",
            });
        }

        const membership = await Membership.findOne({
            userId,
            organizationId,
            status: "ACTIVE",
        });

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: "You must be an active member of this organization",
            });
        }

        const organization = await Organization.findById(organizationId);

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: organization,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch organization",
            error: error.message,
        });
    }
};

export const updateOrganization = async (req, res) => {
    try {
        const { organizationId } = req.params;
        const { name, description } = req.body;
        const userId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(organizationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid organization id",
            });
        }

        const membership = await Membership.findOne({
            userId,
            organizationId,
            role: "ADMIN",
            status: "ACTIVE",
        });

        if (!membership) {
            return res.status(403).json({
                success: false,
                message: "Only active organization admins can update this organization",
            });
        }

        const updateData = {};

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Organization name cannot be empty",
                });
            }
            updateData.name = name.trim();
        }

        if (description !== undefined) {
            updateData.description = description.trim();
        }

        const organization = await Organization.findByIdAndUpdate(
            organizationId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: organization,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update organization",
            error: error.message,
        });
    }
};

export const deleteOrganization = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { organizationId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization id",
      });
    }

    const membership = await Membership.findOne({
      userId,
      organizationId,
      role: "ADMIN",
      status: "ACTIVE",
    }).session(session);

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Only active organization admins can delete this organization",
      });
    }

    const organization = await Organization.findById(organizationId)
      .session(session);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    await session.withTransaction(async () => {

      // 1. Find all boards
      const boards = await Board.find({
        organizationId,
      })
        .select("_id")
        .session(session);

      const boardIds = boards.map((board) => board._id);

      // 2. Find all sections
      const sections = await Section.find({
        boardId: { $in: boardIds },
      })
        .select("_id")
        .session(session);

      const sectionIds = sections.map((section) => section._id);

      // 3. Find all issues
      const issues = await Issue.find({
        sectionId: { $in: sectionIds },
      })
        .select("_id")
        .session(session);

      const issueIds = issues.map((issue) => issue._id);

      // 4. Delete comments
      if (issueIds.length > 0) {
        await Comment.deleteMany({
          issueId: { $in: issueIds },
        }).session(session);
      }

      // 5. Delete issues
      if (sectionIds.length > 0) {
        await Issue.deleteMany({
          sectionId: { $in: sectionIds },
        }).session(session);
      }

      // 6. Delete sections
      if (boardIds.length > 0) {
        await Section.deleteMany({
          boardId: { $in: boardIds },
        }).session(session);
      }

      // 7. Delete boards
      await Board.deleteMany({
        organizationId,
      }).session(session);

      // 8. Delete memberships
      await Membership.deleteMany({
        organizationId,
      }).session(session);

      // 9. Delete organization
      await Organization.deleteOne({
        _id: organizationId,
      }).session(session);
    });

    return res.status(200).json({
      success: true,
      message: "Organization and all related data deleted successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete organization",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};