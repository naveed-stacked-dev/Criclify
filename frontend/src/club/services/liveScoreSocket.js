/**
 * Socket.IO client for live scoring updates.
 * Manages connection lifecycle, room subscriptions, and reconnection.
 */
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

/**
 * Get or create the socket connection singleton.
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: false,
    });

    socket.on("connect", () => {
      console.log("🔌 Live score socket connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Live score socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("⚠️ Socket connection error:", error.message);
    });
  }

  return socket;
};

/**
 * Connect the socket (call once when entering club pages).
 */
export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

/**
 * Disconnect socket (call when leaving club pages).
 */
export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

/**
 * Join a match room for live updates.
 */
export const joinMatch = (matchId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit("join_match", { matchId });
  }
};

/**
 * Leave a match room.
 */
export const leaveMatch = (matchId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit("leave_match", { matchId });
  }
};

/**
 * Join a club room for all live match updates for that club.
 */
export const joinClub = (clubId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit("join_club", { clubId });
  }
};

/**
 * Leave a club room.
 */
export const leaveClub = (clubId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit("leave_club", { clubId });
  }
};

/**
 * Subscribe to an event with a callback. Returns unsubscribe function.
 */
export const onEvent = (eventName, callback) => {
  const s = getSocket();
  s.on(eventName, callback);
  return () => s.off(eventName, callback);
};

export default {
  getSocket,
  connectSocket,
  disconnectSocket,
  joinMatch,
  leaveMatch,
  joinClub,
  leaveClub,
  onEvent,
};
