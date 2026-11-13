import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { AI_ACTION_TYPES } from "../../models/aiAction.model.js";
import { createAIAction } from "../../usecases/aiAction.usecase.js";
import { UseCaseError } from "../../usecases/usecase.helpers.js";

const getTrustedBoardContext = (runtime) => {
  const { userId, boardId, organizationId } = runtime?.context ?? {};

  if (!userId || !boardId || !organizationId) {
    throw new Error(
      "Authenticated user, board, and organization context are required"
    );
  }

  return { userId, boardId, organizationId };
};

export const proposeAIActionTool = tool(
  async ({ actionType, arguments: actionArguments }, runtime) => {
    const context = getTrustedBoardContext(runtime);
    let action;
    try {
      action = await createAIAction({
        ...context,
        actionType,
        arguments: actionArguments,
      });
    } catch (error) {
      if (error instanceof UseCaseError) {
        throw error;
      }
      throw new Error("Could not create an AI action proposal");
    }

    return JSON.stringify({
      actionType: action.actionType,
      status: action.status,
      expiresAt: action.expiresAt.toISOString(),
    });
  },
  {
    name: "propose_board_action",
    description:
      "Create a pending proposal only when the user explicitly requests a board change. Allowed arguments: CREATE_ISSUE {title, sectionId, description?}; UPDATE_ISSUE {issueId, title?, description?}; DELETE_ISSUE {issueId}; MOVE_ISSUE {issueId, destinationSectionId}; CREATE_SECTION {name}; UPDATE_SECTION {sectionId, name}; DELETE_SECTION {sectionId}; CREATE_COMMENT {issueId, content}; UPDATE_COMMENT {commentId, content}; DELETE_COMMENT {commentId}. Use only resource IDs from current-board tools. Never include userId, boardId, or organizationId. This tool never executes or approves the action; trusted user, board, and organization context is supplied by the backend.",
    schema: z.object({
      actionType: z.enum(AI_ACTION_TYPES),
      arguments: z.record(z.string(), z.unknown()),
    }),
  }
);
