import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { createBoardTools } from "../tools/board.tools.js";
import { BOARD_ASSISTANT_SYSTEM_PROMPT } from "../prompts/boardAssistant.prompt.js";
import { createLlm } from "../services/llm.service.js";

export const createBoardAgent = ({ userId, llm } = {}) => {
  const model = llm ?? createLlm();
  const tools = createBoardTools({ userId, llm: model });
  const modelWithTools = model.bindTools(tools);

  const callModel = async (state) => ({
    messages: [
      await modelWithTools.invoke([
        { role: "system", content: BOARD_ASSISTANT_SYSTEM_PROMPT },
        ...state.messages,
      ]),
    ],
  });

  const routeAfterModel = (state) =>
    state.messages.at(-1)?.tool_calls?.length ? "tools" : END;

  return new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", new ToolNode(tools))
    .addEdge(START, "agent")
    .addConditionalEdges("agent", routeAfterModel, ["tools", END])
    .addEdge("tools", "agent")
    .compile();
};
