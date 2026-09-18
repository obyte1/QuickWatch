const userSockets = new Map();
let io;

const setIo = (socketIo) => {
  io = socketIo;
};

const addSocket = (userId, socketId) => {
  const key = String(userId);
  const sockets = userSockets.get(key) || new Set();
  sockets.add(socketId);
  userSockets.set(key, sockets);
};

const removeSocket = (userId, socketId) => {
  const key = String(userId);
  const sockets = userSockets.get(key);
  if (!sockets) return;
  sockets.delete(socketId);
  if (!sockets.size) userSockets.delete(key);
};

const isOnline = (userId) => Boolean(userSockets.get(String(userId))?.size);

const emitToUser = (userId, event, payload) => {
  if (!io || !isOnline(userId)) return false;
  io.to(`user:${String(userId)}`).emit(event, payload);
  return true;
};

module.exports = {
  setIo,
  addSocket,
  removeSocket,
  isOnline,
  emitToUser,
};
