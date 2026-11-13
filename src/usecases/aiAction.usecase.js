import AIAction, {
  AI_ACTION_TYPES,
} from "../models/aiAction.model.js";
import Board from "../models/board.model.js";
import Comment from "../models/comment.model.js";
import Issue from "../models/issue.model.js";
import Section from "../models/section.model.js";
import {
  hasActiveAdminMembership,
  requireActiveAdminMembership,
  requireActiveMembership,
  UseCaseError,
  validateObjectId,
} from "./usecase.helpers.js";
import {
  createIssue,
  deleteIssue,
  updateIssue,
} from "./issue.usecase.js";
import {
  createSection,
  deleteSection,
  updateSection,
} from "./section.usecase.js";
import {
  createComment,
  deleteComment,
  updateComment,
} from "./comment.usecase.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const allowedArgumentKeys = {
  CREATE_ISSUE: ["title", "description", "sectionId"],
  UPDATE_ISSUE: ["issueId", "title", "description"],
  DELETE_ISSUE: ["issueId"],
  MOVE_ISSUE: ["issueId", "destinationSectionId"],
  CREATE_SECTION: ["name"],
  UPDATE_SECTION: ["sectionId", "name"],
  DELETE_SECTION: ["sectionId"],
  CREATE_COMMENT: ["issueId", "content"],
  UPDATE_COMMENT: ["commentId", "content"],
  DELETE_COMMENT: ["commentId"],
};

const adminActionTypes = new Set([
  "CREATE_ISSUE",
  "UPDATE_ISSUE",
  "DELETE_ISSUE",
  "MOVE_ISSUE",
  "CREATE_SECTION",
  "UPDATE_SECTION",
  "DELETE_SECTION",
]);

const requireString = (value, label, { allowEmpty = false } = {}) => {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new UseCaseError(`${label} must be a non-empty string`, 400);
  }
  return value.trim();
};

const requireId = (value, label) => {
  validateObjectId(value, label);
  return value.toString();
};

const validateActionArguments = (actionType, input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new UseCaseError("Action arguments must be an object", 400);
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new UseCaseError("Action arguments must be a plain object", 400);
  }

  const allowedKeys = allowedArgumentKeys[actionType];
  if (!allowedKeys) {
    throw new UseCaseError("Unsupported AI action type", 400);
  }

  const unexpectedKey = Object.keys(input).find(
    (key) => !allowedKeys.includes(key)
  );
  if (unexpectedKey) {
    throw new UseCaseError(
      `Action argument "${unexpectedKey}" is not allowed`,
      400
    );
  }

  const args = {};
  const copyOptionalText = (key, label, options) => {
    if (input[key] !== undefined) {
      args[key] = requireString(input[key], label, options);
    }
  };
  const copyId = (key, label) => {
    args[key] = requireId(input[key], label);
  };

  switch (actionType) {
    case "CREATE_ISSUE":
      args.title = requireString(input.title, "Issue title");
      copyOptionalText("description", "Issue description", {
        allowEmpty: true,
      });
      copyId("sectionId", "section");
      break;
    case "UPDATE_ISSUE":
      copyId("issueId", "issue");
      copyOptionalText("title", "Issue title");
      copyOptionalText("description", "Issue description", {
        allowEmpty: true,
      });
      if (args.title === undefined && args.description === undefined) {
        throw new UseCaseError(
          "At least one issue field must be provided",
          400
        );
      }
      break;
    case "DELETE_ISSUE":
      copyId("issueId", "issue");
      break;
    case "MOVE_ISSUE":
      copyId("issueId", "issue");
      copyId("destinationSectionId", "destination section");
      break;
    case "CREATE_SECTION":
      args.name = requireString(input.name, "Section name");
      break;
    case "UPDATE_SECTION":
      copyId("sectionId", "section");
      args.name = requireString(input.name, "Section name");
      break;
    case "DELETE_SECTION":
      copyId("sectionId", "section");
      break;
    case "CREATE_COMMENT":
      copyId("issueId", "issue");
      args.content = requireString(input.content, "Comment content");
      break;
    case "UPDATE_COMMENT":
      copyId("commentId", "comment");
      args.content = requireString(input.content, "Comment content");
      break;
    case "DELETE_COMMENT":
      copyId("commentId", "comment");
      break;
    default:
      throw new UseCaseError("Unsupported AI action type", 400);
  }

  return args;
};

const getAuthorizedBoard = async (userId, boardId) => {
  validateObjectId(userId, "user");
  validateObjectId(boardId, "board");
  const board = await Board.findById(boardId);
  if (!board) {
    throw new UseCaseError("Board not found", 404);
  }

  await requireActiveMembership(
    userId,
    board.organizationId,
    "You do not have access to this board"
  );
  return board;
};

const validateActionResources = async (actionType, args, boardId) => {
  const requireIssueOnBoard = async (issueId) => {
    const issue = await Issue.findOne({ _id: issueId, boardId });
    if (!issue) {
      throw new UseCaseError("Issue not found on this board", 404);
    }
    return issue;
  };
  const requireSectionOnBoard = async (sectionId) => {
    const section = await Section.findOne({ _id: sectionId, boardId });
    if (!section) {
      throw new UseCaseError("Section not found on this board", 404);
    }
    return section;
  };

  switch (actionType) {
    case "CREATE_ISSUE":
      await requireSectionOnBoard(args.sectionId);
      return {};
    case "UPDATE_ISSUE":
    case "DELETE_ISSUE":
      await requireIssueOnBoard(args.issueId);
      return {};
    case "MOVE_ISSUE":
      await requireIssueOnBoard(args.issueId);
      await requireSectionOnBoard(args.destinationSectionId);
      return {};
    case "UPDATE_SECTION":
    case "DELETE_SECTION":
      await requireSectionOnBoard(args.sectionId);
      return {};
    case "CREATE_COMMENT":
      await requireIssueOnBoard(args.issueId);
      return {};
    case "UPDATE_COMMENT":
    case "DELETE_COMMENT": {
      const comment = await Comment.findById(args.commentId);
      if (!comment) {
        throw new UseCaseError("Comment not found", 404);
      }
      await requireIssueOnBoard(comment.issueId);
      return { comment };
    }
    case "CREATE_SECTION":
      return {};
    default:
      throw new UseCaseError("Unsupported AI action type", 400);
  }
};

const requireApprovalAuthorization = async (
  action,
  userId,
  board,
  comment
) => {
  if (adminActionTypes.has(action.actionType)) {
    await requireActiveAdminMembership(
      userId,
      board.organizationId,
      "Only active admins can approve this action"
    );
    return;
  }

  if (action.actionType === "UPDATE_COMMENT") {
    if (comment.userId.toString() !== userId.toString()) {
      throw new UseCaseError("You can only update your own comments", 403);
    }
  }

  if (action.actionType === "DELETE_COMMENT") {
    const isOwner = comment.userId.toString() === userId.toString();
    const isAdmin = await hasActiveAdminMembership(
      userId,
      board.organizationId
    );
    if (!isOwner && !isAdmin) {
      throw new UseCaseError("You cannot delete this comment", 403);
    }
  }
};

const expirePendingAction = async (action) => {
  if (
    action.status !== "PENDING" ||
    action.expiresAt.getTime() > Date.now()
  ) {
    return action;
  }

  return (
    (await AIAction.findOneAndUpdate(
      {
        _id: action._id,
        userId: action.userId,
        boardId: action.boardId,
        status: "PENDING",
        expiresAt: { $lte: new Date() },
      },
      { $set: { status: "EXPIRED" } },
      { new: true }
    )) ||
    (await AIAction.findById(action._id))
  );
};

const executeAIAction = async ({ action, userId }) => {
  const args = action.arguments;
  switch (action.actionType) {
    case "CREATE_ISSUE":
      return createIssue({
        userId,
        boardId: action.boardId,
        title: args.title,
        description: args.description,
        sectionId: args.sectionId,
      });
    case "UPDATE_ISSUE":
      return updateIssue({ userId, ...args });
    case "DELETE_ISSUE":
      return deleteIssue({ userId, issueId: args.issueId });
    case "MOVE_ISSUE":
      return updateIssue({
        userId,
        issueId: args.issueId,
        sectionId: args.destinationSectionId,
      });
    case "CREATE_SECTION":
      return createSection({
        userId,
        boardId: action.boardId,
        name: args.name,
      });
    case "UPDATE_SECTION":
      return updateSection({ userId, ...args });
    case "DELETE_SECTION":
      return deleteSection({ userId, sectionId: args.sectionId });
    case "CREATE_COMMENT":
      return createComment({
        userId,
        issueId: args.issueId,
        content: args.content,
      });
    case "UPDATE_COMMENT":
      return updateComment({ userId, ...args });
    case "DELETE_COMMENT":
      return deleteComment({ userId, commentId: args.commentId });
    default:
      throw new UseCaseError("Unsupported AI action type", 400);
  }
};

export const createAIAction = async ({
  userId,
  boardId,
  organizationId,
  actionType,
  arguments: inputArguments,
}) => {
  if (!AI_ACTION_TYPES.includes(actionType)) {
    throw new UseCaseError("Unsupported AI action type", 400);
  }

  validateObjectId(userId, "user");
  validateObjectId(boardId, "board");
  validateObjectId(organizationId, "organization");

  const board = await Board.findOne({ _id: boardId, organizationId });
  if (!board) {
    throw new UseCaseError("Board does not belong to this organization", 404);
  }

  await requireActiveMembership(
    userId,
    organizationId,
    "You do not have access to this board"
  );

  const args = validateActionArguments(actionType, inputArguments);
  await validateActionResources(actionType, args, board._id);

  return AIAction.create({
    userId,
    boardId: board._id,
    organizationId: board.organizationId,
    actionType,
    arguments: args,
    status: "PENDING",
    expiresAt: new Date(Date.now() + DAY_IN_MS),
  });
};

export const getPendingAIActions = async ({ userId, boardId }) => {
  const board = await getAuthorizedBoard(userId, boardId);
  const now = new Date();
  await AIAction.updateMany(
    {
      userId,
      boardId: board._id,
      organizationId: board.organizationId,
      status: "PENDING",
      expiresAt: { $lte: now },
    },
    { $set: { status: "EXPIRED" } }
  );

  return AIAction.find({
    userId,
    boardId: board._id,
    organizationId: board.organizationId,
    status: "PENDING",
  }).sort({ createdAt: -1 });
};

export const getAIActionById = async ({ userId, boardId, actionId }) => {
  validateObjectId(actionId, "action");
  const board = await getAuthorizedBoard(userId, boardId);
  const action = await AIAction.findOne({
    _id: actionId,
    userId,
    boardId: board._id,
    organizationId: board.organizationId,
  });
  if (!action) {
    throw new UseCaseError("AI action not found", 404);
  }

  return expirePendingAction(action);
};

export const rejectAIAction = async ({ userId, boardId, actionId }) => {
  validateObjectId(actionId, "action");
  const board = await getAuthorizedBoard(userId, boardId);
  const action = await AIAction.findOne({
    _id: actionId,
    userId,
    boardId: board._id,
    organizationId: board.organizationId,
  });
  if (!action) {
    throw new UseCaseError("AI action not found", 404);
  }

  const currentAction = await expirePendingAction(action);
  if (currentAction.status === "EXPIRED") {
    throw new UseCaseError("AI action has expired", 410);
  }
  if (currentAction.status !== "PENDING") {
    throw new UseCaseError("AI action is no longer pending", 409);
  }

  const rejectedAction = await AIAction.findOneAndUpdate(
    {
      _id: actionId,
      userId,
      boardId: board._id,
      organizationId: board.organizationId,
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    },
    { $set: { status: "REJECTED", rejectedAt: new Date() } },
    { new: true }
  );
  if (!rejectedAction) {
    const latestAction = await AIAction.findOne({
      _id: actionId,
      userId,
      boardId: board._id,
      organizationId: board.organizationId,
    });
    if (latestAction?.status === "PENDING") {
      await expirePendingAction(latestAction);
      throw new UseCaseError("AI action has expired", 410);
    }
    throw new UseCaseError("AI action is no longer pending", 409);
  }

  return rejectedAction;
};

export const approveAIAction = async ({ userId, boardId, actionId }) => {
  validateObjectId(actionId, "action");
  const board = await getAuthorizedBoard(userId, boardId);
  const action = await AIAction.findOne({
    _id: actionId,
    userId,
    boardId: board._id,
    organizationId: board.organizationId,
  });
  if (!action) {
    throw new UseCaseError("AI action not found", 404);
  }
  if (action.status !== "PENDING") {
    throw new UseCaseError("AI action is no longer pending", 409);
  }
  if (action.expiresAt.getTime() <= Date.now()) {
    await expirePendingAction(action);
    throw new UseCaseError("AI action has expired", 410);
  }
  if (action.organizationId.toString() !== board.organizationId.toString()) {
    throw new UseCaseError("AI action does not belong to this board", 409);
  }

  await requireActiveMembership(
    userId,
    board.organizationId,
    "You do not have access to this board"
  );

  const args = validateActionArguments(action.actionType, action.arguments);
  const { comment } = await validateActionResources(
    action.actionType,
    args,
    board._id
  );
  await requireApprovalAuthorization(action, userId, board, comment);

  const approvedAt = new Date();
  const claimedAction = await AIAction.findOneAndUpdate(
    {
      _id: actionId,
      userId,
      boardId: board._id,
      organizationId: board.organizationId,
      status: "PENDING",
      expiresAt: { $gt: approvedAt },
    },
    {
      $set: {
        status: "EXECUTING",
        approvedAt,
      },
      $unset: { executionError: 1 },
    },
    { new: true }
  );

  if (!claimedAction) {
    const latestAction = await AIAction.findOne({
      _id: actionId,
      userId,
      boardId: board._id,
      organizationId: board.organizationId,
    });
    if (latestAction?.status === "PENDING") {
      await expirePendingAction(latestAction);
      throw new UseCaseError("AI action has expired", 410);
    }
    throw new UseCaseError("AI action is no longer pending", 409);
  }

  let result;
  try {
    result = await executeAIAction({
      action: {
        ...claimedAction.toObject(),
        arguments: args,
      },
      userId,
    });
  } catch (error) {
    const executionError =
      error instanceof UseCaseError
        ? error.message
        : "Action execution failed";
    const failedAction = await AIAction.findOneAndUpdate(
      { _id: claimedAction._id, status: "EXECUTING" },
      {
        $set: {
          status: "FAILED",
          completedAt: new Date(),
          executionError,
        },
      },
      { new: true }
    );

    if (!failedAction) {
      throw new Error("Could not record failed AI action");
    }

    return { action: failedAction, result: null };
  }

  const completedAction = await AIAction.findOneAndUpdate(
    { _id: claimedAction._id, status: "EXECUTING" },
    {
      $set: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      $unset: { executionError: 1 },
    },
    { new: true }
  );

  if (!completedAction) {
    throw new Error("Could not record completed AI action");
  }

  return { action: completedAction, result };
};
