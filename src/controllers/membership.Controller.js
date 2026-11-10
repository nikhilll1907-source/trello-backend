import { respondToUseCaseError } from "./controllerError.js";
import {
  acceptInvitation as acceptInvitationUseCase,
  deleteMembership as deleteMembershipUseCase,
  getOrganizationMembers as getOrganizationMembersUseCase,
  inviteMember as inviteMemberUseCase,
  updateMembership as updateMembershipUseCase,
} from "../usecases/membership.usecase.js";

export const inviteMember = async (req, res) => {
  try {
    const membership = await inviteMemberUseCase({
      ...req.body,
      currentUserId: req.userId,
    });
    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: membership,
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to invite member", {
      includeSuccess: true,
    });
  }
};

export const getOrganizationMembers = async (req, res) => {
  try {
    const members = await getOrganizationMembersUseCase({
      userId: req.userId,
      organizationId: req.params.organizationId,
      status: req.query.status,
    });
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    return respondToUseCaseError(
      res,
      error,
      "Failed to fetch organization members",
      { includeSuccess: true }
    );
  }
};

export const updateMembership = async (req, res) => {
  try {
    const membership = await updateMembershipUseCase({
      currentUserId: req.userId,
      membershipId: req.params.membershipId,
      role: req.body.role,
    });
    return res.status(200).json({ success: true, data: membership });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to update membership", {
      includeSuccess: true,
    });
  }
};

export const acceptInvitation = async (req, res) => {
  try {
    const membership = await acceptInvitationUseCase({
      userId: req.userId,
      membershipId: req.params.membershipId,
    });
    return res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: membership,
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to accept invitation", {
      includeSuccess: true,
    });
  }
};

export const deleteMembership = async (req, res) => {
  try {
    const membership = await deleteMembershipUseCase({
      currentUserId: req.userId,
      membershipId: req.params.membershipId,
    });
    return res.status(200).json({
      success: true,
      message: "Membership deleted successfully",
      data: membership,
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to delete membership", {
      includeSuccess: true,
    });
  }
};
