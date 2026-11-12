import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getSectionIssues } from "../../usecases/issue.usecase.js";
import { getBoardSections, getSection } from "../../usecases/section.usecase.js";
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

const serializeSection = (section) => ({
  _id: section?._id ? section._id.toString() : null,
  name: section?.name ?? "",
  boardId: section?.boardId ? section.boardId.toString() : null,
  position: section?.position ?? 0,
  createdAt: section?.createdAt ? new Date(section.createdAt).toISOString() : null,
  updatedAt: section?.updatedAt ? new Date(section.updatedAt).toISOString() : null,
});

const ensureCurrentBoardSection = (section, boardId) => {
  if (!section) {
    throw new Error("Section not found");
  }

  if (section.boardId?.toString() !== boardId.toString()) {
    throw new Error("Requested section does not belong to the current board");
  }
};

export const getBoardSectionsTool = tool(
  async (_input, runtime) => {
    const { userId, boardId } = getTrustedBoardContext(runtime);
    const sections = await getBoardSections({ userId, boardId });

    return JSON.stringify(sections.map(serializeSection));
  },
  {
    name: "get_board_sections",
    description:
      "Retrieve all sections on the currently opened Trello board for the authenticated user. The board and user are supplied securely by the backend and cannot be set by the model.",
    schema: z.object({}),
  }
);

export const getSectionDetailsTool = tool(
  async ({ sectionId }, runtime) => {
    const { userId, boardId } = getTrustedBoardContext(runtime);
    const section = await getSection({ userId, sectionId });

    ensureCurrentBoardSection(section, boardId);

    return JSON.stringify(serializeSection(section));
  },
  {
    name: "get_section_details",
    description:
      "Retrieve the metadata for a specific section on the current board. The section ID is provided by the model, while the authenticated user and board come from backend runtime context only.",
    schema: z.object({
      sectionId: z.string().trim().min(1),
    }),
  }
);

export const getSectionIssuesTool = tool(
  async ({ sectionId }, runtime) => {
    const { userId, boardId } = getTrustedBoardContext(runtime);
    const section = await getSection({ userId, sectionId });

    ensureCurrentBoardSection(section, boardId);

    const issues = await getSectionIssues({ userId, sectionId });

    return JSON.stringify(await enrichIssueCreators(issues));
  },
  {
    name: "get_section_issues",
    description:
      "Retrieve all issues belonging to a particular section on the current board. The model only supplies the section ID; the board membership is enforced by runtime context and existing usecases.",
    schema: z.object({
      sectionId: z.string().trim().min(1),
    }),
  }
);
