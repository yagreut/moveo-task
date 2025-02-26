const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/CodeBlocks")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const codeBlockSchema = new mongoose.Schema({
  name: { type: String, required: true },
  initialCode: { type: String, required: true },
  solution: { type: String, required: true },
});

const CodeBlock = mongoose.model("CodeBlock", codeBlockSchema, "CodeBlocks");
const codeblockStates = {};

app.get("/codeblocks", async (req, res) => {
  const codeblocks = await CodeBlock.find().select("_id name");
  res.json(codeblocks);
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", async (codeblockId) => {
    socket.join(codeblockId);

    if (!codeblockStates[codeblockId]) {
      const codeblock = await CodeBlock.findById(codeblockId);
      codeblockStates[codeblockId] = {
        mentorId: null,
        currentCode: codeblock.initialCode,
        solution: codeblock.solution,
        messages: [],
      };
    }

    const state = codeblockStates[codeblockId];
    const room = io.sockets.adapter.rooms.get(codeblockId);
    const numClients = room ? room.size : 0;

    let role = "mentor";
    if (state.mentorId && io.sockets.sockets.get(state.mentorId)) {
      role = "student";
    } else {
      state.mentorId = socket.id;
    }

    const numStudents = state.mentorId ? numClients - 1 : numClients;

    socket.emit("init", {
      role,
      currentCode: state.currentCode,
      numStudents,
      messages: state.messages,
    });

    io.to(codeblockId).emit("updateStudents", numStudents);
  });

  socket.on("updateCode", ({ codeblockId, newCode }) => {
    const state = codeblockStates[codeblockId];
    state.currentCode = newCode;

    console.log(`Code updated in ${codeblockId}: ${newCode}`);
    io.to(codeblockId).emit("codeUpdated", newCode);

    // Improved normalization: Remove spaces, replace single quotes with double, remove escape characters
    const normalizedStudentCode = newCode
      .replace(/\s/g, "")
      .replace(/'/g, '"')
      .replace(/\\/g, "");
    const normalizedSolution = state.solution
      .replace(/\s/g, "")
      .replace(/'/g, '"')
      .replace(/\\/g, "");
    console.log(
      `Checking solution - Student: "${normalizedStudentCode}", Solution: "${normalizedSolution}"`
    );
    if (normalizedStudentCode === normalizedSolution) {
      console.log(`Solution matched for ${codeblockId}, notifying room`);
      io.to(codeblockId).emit("solutionMatched");
    } else {
      console.log(`Solution not matched for ${codeblockId}`);
    }
  });

  socket.on("sendMessage", ({ codeblockId, message }) => {
    const state = codeblockStates[codeblockId];
    const chatMessage = {
      id: socket.id,
      message,
      timestamp: new Date().toISOString(),
    };
    state.messages.push(chatMessage);
    io.to(codeblockId).emit("newMessage", chatMessage);
  });

  socket.on("leaveRoom", async (codeblockId) => {
    const state = codeblockStates[codeblockId];
    if (state && state.mentorId === socket.id) {
      io.to(codeblockId).emit("mentorLeft");
      const codeblock = await CodeBlock.findById(codeblockId);
      codeblockStates[codeblockId] = {
        mentorId: null,
        currentCode: codeblock.initialCode,
        solution: codeblock.solution, // Reload solution from DB
        messages: [],
      };
    }
    socket.leave(codeblockId);
  });

  socket.on("disconnect", async () => {
    for (const codeblockId in codeblockStates) {
      const state = codeblockStates[codeblockId];
      if (state.mentorId === socket.id) {
        io.to(codeblockId).emit("mentorLeft");
        const codeblock = await CodeBlock.findById(codeblockId);
        codeblockStates[codeblockId] = {
          mentorId: null,
          currentCode: codeblock.initialCode,
          solution: codeblock.solution, // Reload solution from DB
          messages: [],
        };
      } else {
        const room = io.sockets.adapter.rooms.get(codeblockId);
        const numClients = room ? room.size : 0;
        const numStudents = state.mentorId ? numClients - 1 : numClients;
        io.to(codeblockId).emit("updateStudents", numStudents);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
