
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getIssue,
  getSectionIssues,
} from "../../usecases/issue.usecase.js";
import { getIssueComments } from "../../usecases/comment.usecase.js";
import { getBoardSections } from "../../usecases/section.usecase.js";
import { enrichCommentAuthors } from "./userName.helper.js";

const getTrustedBoardContext = (runtime) => {
  const { userId, boardId, organizationId } = runtime?.context ?? {};

  if (!userId || !boardId || !organizationId) {
    throw new Error(
      "Authenticated user, board, and organization context are required"
    );
  }

  return { userId, boardId, organizationId };
};

const serializeComment = (comment) => ({
  _id: comment?._id?.toString() ?? null,
  content: comment?.content ?? "",
  issueId: comment?.issueId?.toString() ?? null,
  issueTitle: comment?.issueTitle ?? null,
  sectionId: comment?.sectionId?.toString() ?? null,
  author: {
    name: comment?.author?.name || "Unknown user",
  },
  createdAt: comment?.createdAt
    ? new Date(comment.createdAt).toISOString()
    : null,
  updatedAt: comment?.updatedAt
    ? new Date(comment.updatedAt).toISOString()
    : null,
});

const ensureCurrentBoardIssue = (issue, boardId) => {
  if (!issue) {
    throw new Error("Issue not found");
  }

  if (issue.boardId?.toString() !== boardId.toString()) {
    throw new Error("Requested issue does not belong to the current board");
  }
};

const enrichCommentsWithIssueDetails = async (comments, issue) => {
  const enrichedComments = await enrichCommentAuthors(comments);

  return enrichedComments.map((comment) => ({
    ...comment,
    issueTitle: issue.title,
    sectionId: issue.sectionId,
  }));
};

export const getIssueCommentsTool = tool(
  async ({ issueId }, runtime) => {
    const { userId, boardId } = getTrustedBoardContext(runtime);

    const issue = await getIssue({ userId, issueId });
    ensureCurrentBoardIssue(issue, boardId);

    const comments = await getIssueComments({ userId, issueId });

    const enrichedComments = await enrichCommentsWithIssueDetails(
      comments,
      issue
    );

    return JSON.stringify(enrichedComments.map(serializeComment));
  },
  {
    name: "get_issue_comments",
    description:
      "Retrieve all comments for a specific issue on the currently opened board. Returns comment content, author name, issue title, issue ID and section ID. Use author names to identify who wrote each comment.",
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

    const allComments = [];

    for (const issue of issues) {
      const comments = await getIssueComments({
        userId,
        issueId: issue._id,
      });

      allComments.push(
        ...comments.map((comment) => ({
          ...comment.toObject?.() ?? comment,
          issueTitle: issue.title,
          sectionId: issue.sectionId,
        }))
      );
    }

    const enrichedComments = await enrichCommentAuthors(allComments);

    const normalizedQuery = query.trim().toLowerCase();

    const matchingComments = enrichedComments.filter((comment) => {
      const content = comment.content?.toLowerCase() ?? "";
      const authorName = comment.author?.name?.toLowerCase() ?? "";

      return (
        content.includes(normalizedQuery) ||
        authorName.includes(normalizedQuery)
      );
    });

    return JSON.stringify(matchingComments.map(serializeComment));
  },
  {
    name: "search_board_comments",
    description:
      "Search comments across the current board by comment text OR author name. If the user asks for comments written by a person, search using their author name. Returns author names, issue titles, issue IDs and section IDs.",
    schema: z.object({
      query: z.string().trim().min(1).max(200),
    }),
  }
);
