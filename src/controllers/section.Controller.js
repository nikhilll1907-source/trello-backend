import { respondToUseCaseError } from "./controllerError.js";
import {
  createSection as createSectionUseCase,
  deleteSection as deleteSectionUseCase,
  getBoardSections as getBoardSectionsUseCase,
  getSection as getSectionUseCase,
  updateSection as updateSectionUseCase,
} from "../usecases/section.usecase.js";

export const createSection = async (req, res) => {
  try {
    const section = await createSectionUseCase({
      ...req.body,
      userId: req.userId,
    });
    return res.status(201).json({ success: true, data: section });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to create section", {
      includeSuccess: true,
    });
  }
};

export const getSection = async (req, res) => {
  try {
    const section = await getSectionUseCase({
      userId: req.userId,
      sectionId: req.params.sectionId,
    });
    return res.status(200).json({ success: true, data: section });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to fetch section", {
      includeSuccess: true,
    });
  }
};

export const getBoardSections = async (req, res) => {
  try {
    const sections = await getBoardSectionsUseCase({
      userId: req.userId,
      boardId: req.params.boardId,
    });
    return res.status(200).json({ success: true, data: sections });
  } catch (error) {
    return respondToUseCaseError(
      res,
      error,
      "Failed to fetch board sections",
      { includeSuccess: true }
    );
  }
};

export const updateSection = async (req, res) => {
  try {
    const section = await updateSectionUseCase({
      ...req.body,
      userId: req.userId,
      sectionId: req.params.sectionId,
    });
    return res.status(200).json({ success: true, data: section });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to update section", {
      includeSuccess: true,
    });
  }
};

export const deleteSection = async (req, res) => {
  try {
    const section = await deleteSectionUseCase({
      userId: req.userId,
      sectionId: req.params.sectionId,
    });
    return res.status(200).json({
      success: true,
      message: "Section deleted successfully",
      data: section,
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to delete section", {
      includeSuccess: true,
    });
  }
};
