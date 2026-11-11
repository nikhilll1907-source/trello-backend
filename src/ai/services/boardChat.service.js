import { HumanMessage } from "@langchain/core/messages";
import { getBoardById } from "../../usecases/board.usecase.js";
import { boardWorkflow } from "../graph/workflow.js";

export const chatWithBoard = async ({ userId, boardId, message }) => {
  const board = await getBoardById({ userId, boardId });
  const organizationId = board.organizationId;
  const context = { userId, boardId, organizationId };

  const result = await boardWorkflow.invoke(
    {
      messages: [new HumanMessage(message)],
      ...context,
    },
    { context }
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
