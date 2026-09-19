import mongoose from "mongoose";
import Membership from "../models/membership.model.js";
import User from "../models/user.model.js";
import Organization from "../models/organization.model.js";


import { getOrganizationInviteHtml } from "../services/getHtml/organizationInvite.html.js";
import { sendEmail } from "../services/nodemailer.helper.js";

const sendOrganizationInviteEmail = async (
  email,
  organizationName,
  inviterName,
  membershipId
) => {
  const html = getOrganizationInviteHtml(
    organizationName,
    inviterName,
    membershipId
  );

  return await sendEmail(
    email,
    `Invitation to join ${organizationName}`,
    `You have been invited to join ${organizationName}. Your membership ID is ${membershipId}.`,
    html
  );
};
const ensureAdminForOrganization = async (userId, organizationId) => {

  const membership = await Membership.findOne({
    userId,
    organizationId,
    role: "ADMIN",
  });

  return !!membership;
};

export const inviteMember = async (req, res) => {
  try {
    const { organizationId, role = "MEMBER", email } = req.body;
    let targetUserId = req.body.userId;
    const currentUserId = req.userId;


    // 1. Validate organization ID
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization id",
      });
    }

    // 2. Find user using email if userId is not provided
    if (!targetUserId && email) {
      const foundUser = await User.findOne({
        email: email.trim().toLowerCase(),
      });

      if (!foundUser) {
        return res.status(404).json({
          success: false,
          message: `User with email ${email} not found. Please ask them to register first.`,
        });
      }

      targetUserId = foundUser._id;
    }

    // 3. Validate target user ID
    if (
      !targetUserId ||
      !mongoose.Types.ObjectId.isValid(targetUserId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id or email",
      });
    }

    // 4. Find organization
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // 5. Check current user is admin
    const isAdmin = await ensureAdminForOrganization(
      currentUserId,
      organizationId
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only organization admins can invite members",
      });
    }

    // 6. Find target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 7. Validate role
    if (role !== "MEMBER" && role !== "ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Role must be either MEMBER or ADMIN",
      });
    }

    // 8. Check existing membership
    const existingMembership = await Membership.findOne({
      userId: targetUserId,
      organizationId,
    });

    if (existingMembership) {
      return res.status(409).json({
        success: false,
        message: "User is already a member of this organization",
      });
    }

    // 9. Create pending membership
    const membership = await Membership.create({
      userId: targetUserId,
      organizationId,
      role,
      status: "PENDING",
    });
    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Current user not found",
      });
    }

    // 10. Send invitation email
    await sendOrganizationInviteEmail(
      targetUser.email,
      organization.name,
      currentUser.name,
      membership._id
    );

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: membership,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to invite member",
      error: error.message,
    });
  }
};

export const getOrganizationMembers = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization id",
      });
    }

    const isActiveMember = await Membership.findOne({
      userId,
      organizationId,
      status: "ACTIVE",
    });

    if (!isActiveMember) {
      return res.status(403).json({
        success: false,
        message: "You must be an active member of this organization",
      });
    }

    const statusFilter = req.query.status ? { status: req.query.status } : {};

    const members = await Membership.find({ organizationId, ...statusFilter })
      .populate("userId", "name email")
      .populate("organizationId", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch organization members",
      error: error.message,
    });
  }
};

export const updateMembership = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const { role } = req.body;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(membershipId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership id",
      });
    }

    if (!role || (role !== "ADMIN" && role !== "MEMBER")) {
      return res.status(400).json({
        success: false,
        message: "Role must be ADMIN or MEMBER",
      });
    }

    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    const isAdmin = await ensureAdminForOrganization(currentUserId, membership.organizationId);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only organization admins can update memberships",
      });
    }

    if (membership.role === "ADMIN" && role === "MEMBER") {
      const adminCount = await Membership.countDocuments({
        organizationId: membership.organizationId,
        role: "ADMIN",
        status: "ACTIVE",
      });

      if (adminCount < 2) {
        return res.status(400).json({
          success: false,
          message: "At least 2 admins must remain in the organization",
        });
      }
    }

    membership.role = role;
    await membership.save();

    return res.status(200).json({
      success: true,
      data: membership,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update membership",
      error: error.message,
    });
  }
};

export const acceptInvitation = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(membershipId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership id",
      });
    }

    const membership = await Membership.findOne({
      _id: membershipId,
      userId,
      status: "PENDING",
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Pending invitation not found",
      });
    }

    membership.status = "ACTIVE";
    await membership.save();

    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: membership,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to accept invitation",
      error: error.message,
    });
  }
};

export const deleteMembership = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(membershipId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership id",
      });
    }

    const membership = await Membership.findById(membershipId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Membership not found",
      });
    }

    const isAdmin = await ensureAdminForOrganization(
      currentUserId,
      membership.organizationId
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only organization admins can remove members",
      });
    }

    if (membership.role === "ADMIN" && membership.status === "ACTIVE") {
      const adminCount = await Membership.countDocuments({
        organizationId: membership.organizationId,
        role: "ADMIN",
        status: "ACTIVE",
      });

      if (adminCount < 2) {
        return res.status(400).json({
          success: false,
          message: "At least 2 admins must remain in the organization",
        });
      }
    }

    await membership.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Membership deleted successfully",
      data: membership,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete membership",
      error: error.message,
    });
  }
};
