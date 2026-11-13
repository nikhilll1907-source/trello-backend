import mongoose from "mongoose";

export const AI_ACTION_TYPES = Object.freeze([
  "CREATE_ISSUE",
  "UPDATE_ISSUE",
  "DELETE_ISSUE",
  "MOVE_ISSUE",
  "CREATE_SECTION",
  "UPDATE_SECTION",
  "DELETE_SECTION",
  "CREATE_COMMENT",
  "UPDATE_COMMENT",
  "DELETE_COMMENT",
]);

export const AI_ACTION_STATUSES = Object.freeze([
  "PENDING",
  "EXECUTING",
  "COMPLETED",
  "REJECTED",
  "EXPIRED",
  "FAILED",
]);

const aiActionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    actionType: {
      type: String,
      enum: AI_ACTION_TYPES,
      required: true,
    },
    arguments: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: AI_ACTION_STATUSES,
      required: true,
      default: "PENDING",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    approvedAt: Date,
    rejectedAt: Date,
    completedAt: Date,
    executionError: String,
  },
  { timestamps: true }
);

aiActionSchema.index({
  userId: 1,
  boardId: 1,
  status: 1,
  createdAt: -1,
});
aiActionSchema.index({ boardId: 1, status: 1, createdAt: -1 });

const AIAction = mongoose.model("AIAction", aiActionSchema);

export default AIAction;
