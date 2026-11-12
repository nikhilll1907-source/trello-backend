import { END, START, StateGraph } from "@langchain/langgraph";
import { toolsCondition } from "@langchain/langgraph/prebuilt";
import { StateAnnotation } from "./state.js";
import { agentNode, toolNode } from "./nodes.js";

export const shouldContinue = (state) => {
  const lastMessage = state.messages[state.messages.length - 1];

  if (
    lastMessage &&
    "tool_calls" in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls.length > 0
  ) {
    return "tools";
  }

  return END;
};

export const createBoardWorkflow = (checkpointer) => {
  if (!checkpointer) {
    throw new Error(
      "A checkpointer is required to create the board workflow"
    );
  }

  return new StateGraph(StateAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools", "agent")
    .compile({ checkpointer });
};

export let boardWorkflow;

export const initializeBoardWorkflow = (checkpointer) => {
  if (boardWorkflow) {
    return boardWorkflow;
  }

  if (!checkpointer) {
    throw new Error(
      "A checkpointer is required to initialize the board workflow"
    );
  }

  boardWorkflow = createBoardWorkflow(checkpointer);
  return boardWorkflow;
};
