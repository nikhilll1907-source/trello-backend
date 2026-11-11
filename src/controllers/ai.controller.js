import { chatWithBoard as chatWithBoardUseCase } from "../ai/services/boardChat.service.js";
import { respondToUseCaseError } from "./controllerError.js";

const MAX_MESSAGE_LENGTH = 4000;

export const chatWithBoard = async (req, res) => {
  const { message } = req.body ?? {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message must be a non-empty string",
    });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Message must not exceed ${MAX_MESSAGE_LENGTH} characters`,
    });
  }

  try {
    const response = await chatWithBoardUseCase({
      userId: req.userId,
      boardId: req.params.boardId,
      message: message.trim(),
    });

    return res.status(200).json({
      success: true,
      data: { message: response },
    });
  } catch (error) {
    return respondToUseCaseError(res, error, "Failed to process AI chat", {
      includeSuccess: true,
    });
  }
};
