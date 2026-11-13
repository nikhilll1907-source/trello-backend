import { StateAnnotation } from "../graph/state.js";
import { model } from "../services/llm.service.js";
import {
  getBoardDetailsTool,
  getBoardSummaryTool,
} from "../tools/board.tools.js";
import {
  getBoardSectionsTool,
  getSectionDetailsTool,
  getSectionIssuesTool,
} from "../tools/section.tools.js";
import { getIssuesTool, searchIssuesTool } from "../tools/issue.tools.js";
import {
  getIssueCommentsTool,
  searchBoardCommentsTool,
} from "../tools/comment.tools.js";
import { proposeAIActionTool } from "../tools/aiAction.tools.js";

const readOnlyTools = [
  getBoardDetailsTool,
  getBoardSummaryTool,
  getBoardSectionsTool,
  getSectionDetailsTool,
  getSectionIssuesTool,
  getIssuesTool,
  searchIssuesTool,
  getIssueCommentsTool,
  searchBoardCommentsTool,
];

export const tools = [...readOnlyTools, proposeAIActionTool];
export const toolEnabledModel = model.bindTools(tools);

export const boardAgent = Object.freeze({
  model: toolEnabledModel,
  state: StateAnnotation,
  tools,
});
