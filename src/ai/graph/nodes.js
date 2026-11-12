import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { toolEnabledModel, tools } from "../agents/boardAgent.js";
import { getBoardAssistantSystemPrompt } from "../prompts/boardAssistant.prompt.js";

const baseToolNode = new ToolNode(tools, {
  handleToolErrors: true,
});

export const agentNode = async (state) => {
  try {
    const systemMessage = new SystemMessage(
      getBoardAssistantSystemPrompt(state.user?.name)
    );
    const response = await toolEnabledModel.invoke([
      systemMessage,
      ...state.messages,
    ]);
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
  return baseToolNode.invoke(state, config);
};
