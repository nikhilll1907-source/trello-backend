import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// boardRooms structure: Map<boardId, Map<userId, { user: { id: string, name: string }, sockets: Set<WebSocket> }>>
const boardRooms = new Map();

function handleLeaveBoard(boardId, userId, socket, userName) {
  if (!boardId || !userId) return;

  const room = boardRooms.get(boardId);
  if (!room) return;

  const userEntry = room.get(userId);
  if (!userEntry) return;

  userEntry.sockets.delete(socket);

  // Only broadcast USER_LEFT when the user's LAST socket leaves the board
  if (userEntry.sockets.size === 0) {
    room.delete(userId);

    // Broadcast USER_LEFT to all remaining users in the room
    for (const remainingEntry of room.values()) {
      for (const remainingSocket of remainingEntry.sockets) {
        if (remainingSocket.readyState === 1 /* WebSocket.OPEN */) {
          remainingSocket.send(
            JSON.stringify({
              type: "USER_LEFT",
              user: {
                id: userId,
                name: userName || "Member",
              },
            })
          );
        }
      }
    }
  }

  // Delete empty room
  if (room.size === 0) {
    boardRooms.delete(boardId);
  }
}

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

        // LEAVE BOARD

        if (message.type === "LEAVE_BOARD") {
          const boardId = message.boardId || currentBoardId;
          if (boardId && user) {
            handleLeaveBoard(
              boardId,
              user._id.toString(),
              socket,
              user.name
            );
            if (currentBoardId === boardId) {
              currentBoardId = null;
            }
          }
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

          // If this socket was in another board, leave it first
          if (currentBoardId && currentBoardId !== boardId && user) {
            handleLeaveBoard(
              currentBoardId,
              user._id.toString(),
              socket,
              user.name
            );
          }

          currentBoardId = boardId;

          if (!boardRooms.has(boardId)) {
            boardRooms.set(boardId, new Map());
          }

          const room = boardRooms.get(boardId);
          const userId = user._id.toString();

          const isFirstSocket =
            !room.has(userId) || room.get(userId).sockets.size === 0;

          if (!room.has(userId)) {
            room.set(userId, {
              user: {
                id: userId,
                name: user.name,
              },
              sockets: new Set(),
            });
          }

          const userEntry = room.get(userId);
          userEntry.sockets.add(socket);

          // Send current active users (unique users)
          const activeUsers = Array.from(room.values()).map(
            (entry) => entry.user
          );

          socket.send(
            JSON.stringify({
              type: "ACTIVE_USERS",
              users: activeUsers,
            })
          );

          // If this is the user's first socket in the board, broadcast USER_JOINED
          if (isFirstSocket) {
            for (const [otherUserId, otherEntry] of room.entries()) {
              if (otherUserId !== userId) {
                for (const otherSocket of otherEntry.sockets) {
                  if (otherSocket.readyState === 1 /* WebSocket.OPEN */) {
                    otherSocket.send(
                      JSON.stringify({
                        type: "USER_JOINED",
                        user: {
                          id: userId,
                          name: user.name,
                        },
                      })
                    );
                  }
                }
              }
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
      if (!currentBoardId || !user) {
        return;
      }

      handleLeaveBoard(
        currentBoardId,
        user._id.toString(),
        socket,
        user.name
      );

      console.log(
        `${user?.name || "Unknown user"} disconnected from board ${currentBoardId}`
      );
    });
  });
}

export default setupWebSocket;