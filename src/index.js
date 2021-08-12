import express from "express";
import path from "path";
// for socket.io
import http from "http";
import { Server as socketio } from "socket.io";
import Filter from "bad-words";
import generateMessage from "./utils/messages.js";
import { addUser, removeUser, getUsersInRoom, getUser } from "./utils/users.js";

const app = express();

// for socket.io
const server = http.createServer(app);
const io = new socketio(server);

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || "development";

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "/public")));

// socket data transfer with client
io.on("connection", (socket) => {
  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit("message", generateMessage("admin", "Welcome"));

    socket.broadcast
      .to(user.room)
      .emit("message", generateMessage("admin", `${user.username} has joined`));

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    callback();

    // socket.emit, io.emit, socket.broadcast.emit
    // io.to.emit, socket.broadcast.to.emit
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback("profanity is not allowed");
    }

    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("admin", `${user.username} has left`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(PORT, console.log(`Server running in ${ENV} on port ${PORT}`));
