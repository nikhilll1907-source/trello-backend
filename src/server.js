import app from "./app.js";
import http from "http";
import setupWebSocket from "./sockets/socket.js";

export const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

import {connectDB} from "./config/db.js"
connectDB()



setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

