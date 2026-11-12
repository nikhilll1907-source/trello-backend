import { HumanMessage } from "@langchain/core/messages";
import User from "../../models/user.model.js";
import { getBoardById } from "../../usecases/board.usecase.js";
import { UseCaseError } from "../../usecases/usecase.helpers.js";
import { boardWorkflow } from "../graph/workflow.js";

export const chatWithBoard = async ({ userId, boardId, message }) => {
  const user = await User.findById(userId).select("name");
  if (!user) {
    throw new UseCaseError("Authenticated user not found", 401);
  }

  const board = await getBoardById({ userId, boardId });
  const organizationId = board.organizationId;
  const context = { userId, boardId, organizationId };
  const threadId = `${userId}:${boardId}`;

  const result = await boardWorkflow.invoke(
    {
      messages: [new HumanMessage(message)],
      user: {
        name: user.name,
      },
    },
    {
      configurable: {
        thread_id: threadId,
      },
      context,
    }
  );

  const finalMessage = result.messages[result.messages.length - 1];
  if (!finalMessage) {
    throw new Error("The AI assistant returned no response");
  }

  if (
    typeof finalMessage.content === "string" &&
    finalMessage.content.startsWith("I could not process that request.")
  ) {
    return "I could not process that request. Please try again later.";
  }

  return finalMessage.content;
};
