import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { authRouter } from "./routes/auth.route.js";
import { organizationRoute } from "./routes/organization.route.js";
import { membershipRoute } from "./routes/membership.route.js";
import { boardRouter } from "./routes/board.route.js";
import { sectionRoute } from "./routes/section.route.js";
import { issueRoute } from "./routes/issue.route.js";
import { commentRoute } from "./routes/comment.route.js";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests like Postman/server-to-server have no origin
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationRoute);
app.use("/api/memberships", membershipRoute);
app.use("/api/boards", boardRouter);
app.use("/api/sections", sectionRoute);
app.use("/api/issues", issueRoute);
app.use("/api/comments", commentRoute);

export default app;