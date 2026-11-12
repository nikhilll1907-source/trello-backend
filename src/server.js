import app from "./app.js";
import http from "http";
import setupWebSocket from "./sockets/socket.js";
import { connectDB } from "./config/db.js";
import { initializeMongoCheckpointer } from "./ai/checkpointer/mongoCheckpointer.js";
import { initializeBoardWorkflow } from "./ai/graph/workflow.js";

export const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const checkpointer = await initializeMongoCheckpointer();
    initializeBoardWorkflow(checkpointer);

    setupWebSocket(server);

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

await startServer();
