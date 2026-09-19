import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const boardRooms = new Map();

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (socket) => {
    console.log("WebSocket connected");

    let user = null;
    let authenticated = false;
    let currentBoardId = null;

    socket.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // AUTHENTICATION

        if (message.type === "AUTH") {
          const { token } = message;

          if (!token) {
            socket.close();
            return;
          }

          try {
            const decoded = jwt.verify(
              token,
              process.env.JWT_SECRET
            );

            const newUser = await User.findById(decoded.userId)
              .select("_id name email emailVerified");

            if (!newUser) {
              socket.close();
              return;
            }

            if (!newUser.emailVerified) {
              socket.close();
              return;
            }

            user = newUser;
            authenticated = true;

            socket.send(
              JSON.stringify({
                type: "AUTH_SUCCESS",
                user: {
                  id: user._id.toString(),
                  name: user.name,
                },
              })
            );

          //  console.log(`User ${user.name} authenticated`);

          } catch (error) {
         //   console.log("Invalid access token");

            socket.send(
              JSON.stringify({
                type: "AUTH_ERROR",
                message: "Invalid or expired access token",
              })
            );

            socket.close();
          }

          return;
        }

        // CHECK AUTH

        if (!authenticated) {
          socket.send(
            JSON.stringify({
              type: "ERROR",
              message: "WebSocket authentication required",
            })
          );

          return;
        }

        // JOIN BOARD
   

        if (message.type === "JOIN_BOARD") {
          const { boardId } = message;

          if (!boardId) {
            socket.send(
              JSON.stringify({
                type: "ERROR",
                message: "Board ID required",
              })
            );

            return;
          }

          currentBoardId = boardId;

          if (!boardRooms.has(boardId)) {
            boardRooms.set(boardId, new Set());
          }

          const room = boardRooms.get(boardId);

          room.add({
            socket,
            user: {
              id: user._id.toString(),
              name: user.name,
            },
          });

       //   console.log(`${user.name} joined board ${boardId}`);

          // Send current active users
          const activeUsers = [...room].map((connection) => {
            return connection.user;
          });

          socket.send(
            JSON.stringify({
              type: "ACTIVE_USERS",
              users: activeUsers,
            })
          );

          // Notify other users
          for (const connection of room) {
            if (connection.socket !== socket) {
              connection.socket.send(
                JSON.stringify({
                  type: "USER_JOINED",
                  user: {
                    id: user._id.toString(),
                    name: user.name,
                  },
                })
              );
            }
          }

          return;
        }
      } catch (error) {
      //  console.error("WebSocket message error:", error);

        socket.send(
          JSON.stringify({
            type: "ERROR",
            message: "Invalid message",
          })
        );
      }
    });

    // DISCONNECT

    socket.on("close", () => {
      if (!currentBoardId) {
        return;
      }

      const room = boardRooms.get(currentBoardId);

      if (!room) {
        return;
      }

      // Remove this socket
      for (const connection of room) {
        if (connection.socket === socket) {
          room.delete(connection);
          break;
        }
      }

      // Notify remaining users
      for (const connection of room) {
        connection.socket.send(
          JSON.stringify({
            type: "USER_LEFT",
            user: {
              id: user._id.toString(),
              name: user.name,
            },
          })
        );
      }

      // Delete empty room
      if (room.size === 0) {
        boardRooms.delete(currentBoardId);
      }

      console.log(
        `${user?.name || "Unknown user"} disconnected from board ${currentBoardId}`
      );
    });
  });
}

export default setupWebSocket;