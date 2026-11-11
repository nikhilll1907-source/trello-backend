import { AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { toolEnabledModel, tools } from "../agents/boardAgent.js";

const baseToolNode = new ToolNode(tools, {
  handleToolErrors: true,
});

export const agentNode = async (state) => {
  try {
    const response = await toolEnabledModel.invoke(state.messages);
    return {
      messages: [response],
    };
  } catch (error) {
    console.error("agentNode failed:", error);

    return {
      messages: [
        new AIMessage({
          content: `I could not process that request. ${error?.message || "Unknown error"}`,
        }),
      ],
    };
  }
};

export const toolNode = async (state, config = {}) => {
  const runtimeContext = {
    userId: state?.userId,
    boardId: state?.boardId,
    organizationId: state?.organizationId,
  };

  return baseToolNode.invoke(state, {
    ...config,
    context: runtimeContext,
  });
};
