import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    role: {
      type: String,
      enum: ["ADMIN", "MEMBER"],
      default: "MEMBER",
    },

    status: {
      type: String,
      enum: ["PENDING", "ACTIVE"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

membershipSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true }
);

const Membership = mongoose.model("Membership", membershipSchema);

export default Membership;