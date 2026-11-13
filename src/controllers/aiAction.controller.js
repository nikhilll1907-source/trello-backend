import { respondToUseCaseError } from "./controllerError.js";
import {
  approveAIAction as approveAIActionUseCase,
  getAIActionById as getAIActionByIdUseCase,
  getPendingAIActions as getPendingAIActionsUseCase,
  rejectAIAction as rejectAIActionUseCase,
} from "../usecases/aiAction.usecase.js";

export const getPendingAIActionsController = async (req, res) => {
  try {
    const actions = await getPendingAIActionsUseCase({
      userId: req.userId,
      boardId: req.params.boardId,
    });
    return res.status(200).json({ success: true, data: actions });
  } catch (error) {
    return respondToUseCaseError(
      res,
      error,
      "Failed to fetch pending AI actions",
      { includeSuccess: true }
    );
  }
};

export const getAIActionByIdController = async (req, res) => {
  try {
    const action = await getAIActionByIdUseCase({
      userId: req.userId,
      boardId: req.params.boardId,
      actionId: req.params.actionId,
    });
    return res.status(200).json({ success: true, data: action });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to fetch AI action", {
      includeSuccess: true,
    });
  }
};

export const approveAIActionController = async (req, res) => {
  try {
    const { action, result } = await approveAIActionUseCase({
      userId: req.userId,
      boardId: req.params.boardId,
      actionId: req.params.actionId,
    });
    const completed = action.status === "COMPLETED";
    return res.status(200).json({
      success: completed,
      message: completed
        ? "AI action completed"
        : action.executionError || "AI action failed",
      data: { action, result },
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to approve AI action", {
      includeSuccess: true,
    });
  }
};

export const rejectAIActionController = async (req, res) => {
  try {
    const action = await rejectAIActionUseCase({
      userId: req.userId,
      boardId: req.params.boardId,
      actionId: req.params.actionId,
    });
    return res.status(200).json({ success: true, data: action });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to reject AI action", {
      includeSuccess: true,
    });
  }
};
