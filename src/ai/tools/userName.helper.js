import User from "../../models/user.model.js";

const getReferenceId = (reference) => {
  if (reference === null || reference === undefined) {
    return null;
  }

  const id =
    typeof reference === "object" && reference._id !== undefined
      ? reference._id
      : reference;
  const value = id?.toString?.();

  return value && value !== "[object Object]" ? value : null;
};

const toPlainObject = (record) =>
  typeof record?.toObject === "function" ? record.toObject() : { ...record };

export const resolveUserNames = async (references) => {
  const uniqueIds = [
    ...new Set(references.map(getReferenceId).filter(Boolean)),
  ];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const users = await User.find({ _id: { $in: uniqueIds } })
    .select("_id name")
    .lean();

  return new Map(
    users.map((user) => [getReferenceId(user._id), user.name || "Unknown user"])
  );
};

export const enrichIssueCreators = async (issues) => {
  const records = issues.map(toPlainObject);
  const namesById = await resolveUserNames(
    records.map((issue) => issue.createdBy)
  );

  return records.map(({ createdBy, ...issue }) => ({
    ...issue,
    createdBy: {
      name: namesById.get(getReferenceId(createdBy)) || "Unknown user",
    },
  }));
};

export const enrichCommentAuthors = async (comments) => {
  const records = comments.map(toPlainObject);
  const namesById = await resolveUserNames(
    records.map((comment) => comment.userId)
  );

  return records.map(({ userId, ...comment }) => ({
    ...comment,
    author: {
      name: namesById.get(getReferenceId(userId)) || "Unknown user",
    },
  }));
};
