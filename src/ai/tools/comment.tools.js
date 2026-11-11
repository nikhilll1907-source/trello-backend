import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getIssue, getSectionIssues } from "../../usecases/issue.usecase.js";
import { getIssueComments } from "../../usecases/comment.usecase.js";
import { getBoardSections } from "../../usecases/section.usecase.js";

const getTrustedBoardContext = (runtime) => {
  const { userId, boardId } = runtime?.context ?? {};

  if (!userId || !boardId) {
    throw new Error("Authenticated user and current board context are required");
  }

  return { userId, boardId };
};

const serializeComment = (comment) => ({
  _id: comment?._id ? comment._id.toString() : null,
  content: comment?.content ?? "",
  issueId: comment?.issueId ? comment.issueId.toString() : null,
  userId: comment?.userId ? comment.userId.toString() : null,
  createdAt: comment?.createdAt ? new Date(comment.createdAt).toISOString() : null,
  updatedAt: comment?.updatedAt ? new Date(comment.updatedAt).toISOString() : null,
});

const ensureCurrentBoardIssue = (issue, boardId) => {
  if (!issue) {
    throw new Error("Issue not found");
  }

  if (issue.boardId?.toString() !== boardId.toString()) {
    throw new Error("Requested issue does not belong to the current board");
  }
};

export const getIssueCommentsTool = tool(
  async ({ issueId }, runtime) => {
    const { userId, boardId } = getTrustedBoardContext(runtime);
    const issue = await getIssue({ userId, issueId });

    ensureCurrentBoardIssue(issue, boardId);

    const comments = await getIssueComments({ userId, issueId });

    return JSON.stringify(comments.map(serializeComment));
  },
  {
    name: "get_issue_comments",
    description:
      "Retrieve all comments for a specific issue on the currently opened board. The model only provides the issue ID; the user and board are supplied by the backend runtime context.",
    schema: z.object({
      issueId: z.string().trim().min(1),
    }),
  }
);

export const searchBoardCommentsTool = tool(
  async ({ query }, runtime) => {
    const { userId, boardId } = getTrustedBoardContext(runtime);
    const sections = await getBoardSections({ userId, boardId });

    const issueLists = await Promise.all(
      sections.map((section) =>
        getSectionIssues({ userId, sectionId: section._id })
      )
    );

    const issues = issueLists.flat();
    const matchingComments = [];
    const normalizedQuery = query.toLowerCase();

    for (const issue of issues) {
      const issueComments = await getIssueComments({ userId, issueId: issue._id });
      const filteredComments = issueComments.filter((comment) =>
        comment.content?.toLowerCase().includes(normalizedQuery)
      );

      matchingComments.push(...filteredComments.map(serializeComment));
    }

    return JSON.stringify(matchingComments);
  },
  {
    name: "search_board_comments",
    description:
      "Search comments across the current board for the provided text while never leaving the active board context. The model supplies only the search query, while the board and user are secure runtime values.",
    schema: z.object({
      query: z.string().trim().min(1).max(200),
    }),
  }
);
