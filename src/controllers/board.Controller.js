import { respondToUseCaseError } from "./controllerError.js";
import {
  createBoard as createBoardUseCase,
  deleteBoard as deleteBoardUseCase,
  getBoardById as getBoardByIdUseCase,
  getBoards as getBoardsUseCase,
  updateBoard as updateBoardUseCase,
} from "../usecases/board.usecase.js";

export const createBoard = async (req, res) => {
  try {
    const board = await createBoardUseCase({
      ...req.body,
      userId: req.userId,
    });
    return res.status(201).json({ success: true, data: board });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to create board", {
      includeSuccess: true,
    });
  }
};

export const getBoards = async (req, res) => {
  try {
    const boards = await getBoardsUseCase({
      userId: req.userId,
      organizationId: req.params.organizationId,
    });
    return res.status(200).json({ success: true, data: boards });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to fetch boards", {
      includeSuccess: true,
    });
  }
};

export const getBoardById = async (req, res) => {
  try {
    const board = await getBoardByIdUseCase({
      userId: req.userId,
      boardId: req.params.boardId,
    });
    return res.status(200).json({ success: true, data: board });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to fetch board", {
      includeSuccess: true,
    });
  }
};

export const updateBoard = async (req, res) => {
  try {
    const board = await updateBoardUseCase({
      boardId: req.params.boardId,
      ...req.body,
      userId: req.userId,
    });
    return res.status(200).json({ success: true, data: board });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to update board", {
      includeSuccess: true,
    });
  }
};

export const deleteBoard = async (req, res) => {
  try {
    await deleteBoardUseCase({
      userId: req.userId,
      boardId: req.params.boardId,
    });
    return res.status(200).json({
      success: true,
      message: "Board and all related data deleted successfully",
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to delete board", {
      includeSuccess: true,
    });
  }
};
