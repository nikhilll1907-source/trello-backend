import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getSectionIssues } from "../../usecases/issue.usecase.js";
import { getBoardSections } from "../../usecases/section.usecase.js";
import { enrichIssueCreators } from "./userName.helper.js";

const getTrustedBoardContext = (runtime) => {
  const { userId, boardId, organizationId } = runtime?.context ?? {};

  if (!userId || !boardId || !organizationId) {
    throw new Error(
      "Authenticated user, board, and organization context are required"
    );
  }

  return { userId, boardId, organizationId };
};

const getCurrentBoardIssues = async (runtime) => {
  const { userId, boardId } = getTrustedBoardContext(runtime);
  const sections = await getBoardSections({ userId, boardId });

  const issueLists = await Promise.all(
    sections.map((section) =>
      getSectionIssues({ userId, sectionId: section._id })
    )
  );

  return issueLists.flat();
};

export const getIssuesTool = tool(
  async (_input, runtime) => {
    const issues = await getCurrentBoardIssues(runtime);
    return JSON.stringify(await enrichIssueCreators(issues));
  },
  {
    name: "get_board_issues",
    description:
      "Retrieve the issues from the current authenticated Trello board. Use this to review or summarize board issues. The board and user are supplied securely by the backend.",
    schema: z.object({}),
  }
);

export const searchIssuesTool = tool(
  async ({ query }, runtime) => {
    const issues = await getCurrentBoardIssues(runtime);
    const normalizedQuery = query.toLowerCase();
    const matchingIssues = issues.filter((issue) =>
      [issue.title, issue.description].some((value) =>
        value?.toLowerCase().includes(normalizedQuery)
      )
    );

    return JSON.stringify(await enrichIssueCreators(matchingIssues));
  },
  {
    name: "search_board_issues",
    description:
      "Search issue titles and descriptions on the current authenticated Trello board for the provided text. This search never spans other boards.",
    schema: z.object({
      query: z.string().trim().min(1).max(200),
    }),
  }
);
