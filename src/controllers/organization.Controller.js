import { respondToUseCaseError } from "./controllerError.js";
import {
  createOrganization as createOrganizationUseCase,
  deleteOrganization as deleteOrganizationUseCase,
  getOrganizationById as getOrganizationByIdUseCase,
  getOrganizations as getOrganizationsUseCase,
  updateOrganization as updateOrganizationUseCase,
} from "../usecases/organization.usecase.js";

export const createOrganization = async (req, res) => {
  try {
    const organization = await createOrganizationUseCase({
      ...req.body,
      userId: req.userId,
    });
    return res.status(201).json({ success: true, data: organization });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to create organization", {
      includeSuccess: true,
    });
  }
};

export const getOrganizations = async (req, res) => {
  try {
    const organizations = await getOrganizationsUseCase({ userId: req.userId });
    return res.status(200).json({ success: true, data: organizations });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to fetch organizations", {
      includeSuccess: true,
    });
  }
};

export const getOrganizationById = async (req, res) => {
  try {
    const organization = await getOrganizationByIdUseCase({
      userId: req.userId,
      organizationId: req.params.organizationId,
    });
    return res.status(200).json({ success: true, data: organization });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to fetch organization", {
      includeSuccess: true,
    });
  }
};

export const updateOrganization = async (req, res) => {
  try {
    const organization = await updateOrganizationUseCase({
      organizationId: req.params.organizationId,
      ...req.body,
      userId: req.userId,
    });
    return res.status(200).json({ success: true, data: organization });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to update organization", {
      includeSuccess: true,
    });
  }
};

export const deleteOrganization = async (req, res) => {
  try {
    await deleteOrganizationUseCase({
      userId: req.userId,
      organizationId: req.params.organizationId,
    });
    return res.status(200).json({
      success: true,
      message: "Organization and all related data deleted successfully",
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to delete organization", {
      includeSuccess: true,
    });
  }
};
