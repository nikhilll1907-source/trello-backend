import { HumanMessage } from "@langchain/core/messages";
import User from "../../models/user.model.js";
import { getBoardById } from "../../usecases/board.usecase.js";
import { UseCaseError } from "../../usecases/usecase.helpers.js";
import { boardWorkflow } from "../graph/workflow.js";

export const getBoardThreadId = ({ userId, boardId }) =>
  `${userId}:${boardId}`;

const getMessageText = (content) => {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (typeof block === "string") {
        return block;
      }

      return typeof block?.text === "string" ? block.text : "";
    })
    .join("");
};

const isSuccessfulProposalResult = (message) => {
  const type =
    typeof message?.getType === "function"
      ? message.getType()
      : message?.type;

  if (
    type !== "tool" ||
    message.name !== "propose_board_action" ||
    message.status === "error"
  ) {
    return false;
  }

  try {
    const result = JSON.parse(getMessageText(message.content));
    return result?.status === "PENDING" && typeof result.actionType === "string";
  } catch {
    return false;
  }
};

export const formatConversationMessages = (messages) =>
  messages.flatMap((message) => {
    const type =
      typeof message?.getType === "function"
        ? message.getType()
        : message?.type;

    if (type !== "human" && type !== "ai") {
      return [];
    }

    const content = getMessageText(message.content);
    if (!content.trim()) {
      return [];
    }

    return [
      {
        role: type === "human" ? "user" : "assistant",
        content,
      },
    ];
  });

export const chatWithBoard = async ({ userId, boardId, message }) => {
  const user = await User.findById(userId).select("name");
  if (!user) {
    throw new UseCaseError("Authenticated user not found", 401);
  }

  const board = await getBoardById({ userId, boardId });
  const organizationId = board.organizationId;
  const context = { userId, boardId, organizationId };
  const threadId = getBoardThreadId({ userId, boardId });

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

  let latestHumanMessageIndex = -1;
  result.messages.forEach((stateMessage, index) => {
    const type =
      typeof stateMessage?.getType === "function"
        ? stateMessage.getType()
        : stateMessage?.type;
    if (type === "human" && getMessageText(stateMessage.content) === message) {
      latestHumanMessageIndex = index;
    }
  });
  const proposalCreated =
    latestHumanMessageIndex >= 0 &&
    result.messages
      .slice(latestHumanMessageIndex + 1)
      .some(isSuccessfulProposalResult);

  let response = finalMessage.content;
  if (
    typeof finalMessage.content === "string" &&
    finalMessage.content.startsWith("I could not process that request.")
  ) {
    response = "I could not process that request. Please try again later.";
  }

  return { message: response, proposalCreated };
};

export const getBoardConversation = async ({ userId, boardId }) => {
  await getBoardById({ userId, boardId });

  if (typeof boardWorkflow?.getState !== "function") {
    throw new UseCaseError("AI conversation service is not available", 503);
  }

  const threadId = getBoardThreadId({ userId, boardId });
  const snapshot = await boardWorkflow.getState({
    configurable: {
      thread_id: threadId,
    },
  });
  const messages = snapshot.values?.messages ?? [];

  return formatConversationMessages(messages);
};
