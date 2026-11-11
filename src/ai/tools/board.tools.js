import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getBoardById } from "../../usecases/board.usecase.js";
import { getBoardSections } from "../../usecases/section.usecase.js";
import { getSectionIssues } from "../../usecases/issue.usecase.js";

const getTrustedBoardContext = (runtime) => {
  const { userId, boardId } = runtime?.context ?? {};

  if (!userId || !boardId) {
    throw new Error("Authenticated user and current board context are required");
  }

  return { userId, boardId };
};

const serializeBoard = (board) => ({
  _id: board?._id ? board._id.toString() : null,
  title: board?.title ?? "",
  description: board?.description ?? "",
  organizationId: board?.organizationId ? board.organizationId.toString() : null,
  createdAt: board?.createdAt ? new Date(board.createdAt).toISOString() : null,
  updatedAt: board?.updatedAt ? new Date(board.updatedAt).toISOString() : null,
});

export const getBoardDetailsTool = tool(
  async (_input, runtime) => {
    const { userId, boardId } = getTrustedBoardContext(runtime);
    const board = await getBoardById({ userId, boardId });

    return JSON.stringify(serializeBoard(board));
  },
  {
    name: "get_board_details",
    description:
      "Retrieve the details of the currently opened Trello board for the authenticated user. The user and board are supplied securely by the backend, so this tool never accepts board IDs from the model.",
    schema: z.object({}),
  }
);

export const getBoardSummaryTool = tool(
  async (_input, runtime) => {
    const { userId, boardId } = getTrustedBoardContext(runtime);

    const board = await getBoardById({ userId, boardId });
    const sections = await getBoardSections({ userId, boardId });

    const sectionSummaries = await Promise.all(
      sections.map(async (section) => {
        const issues = await getSectionIssues({
          userId,
          sectionId: section._id,
        });

        return {
          sectionId: section._id.toString(),
          sectionName: section.name,
          totalIssues: issues.length,
        };
      })
    );

    const summary = {
      board: serializeBoard(board),
      totalSections: sections.length,
      totalIssues: sectionSummaries.reduce(
        (count, sectionSummary) => count + sectionSummary.totalIssues,
        0
      ),
      sections: sectionSummaries,
    };

    return JSON.stringify(summary);
  },
  {
    name: "get_board_summary",
    description:
      "Summarize the current Trello board for the authenticated user by returning board details, section counts, and the number of issues in each section. This tool only works for the active board supplied by the backend runtime.",
    schema: z.object({}),
  }
);
