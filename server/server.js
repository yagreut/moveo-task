const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const CodeBlock = require("./models/CodeBlock");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "http://localhost:3000" } });

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

// Store state for each code block
const codeblockStates = {};

// API to get list of code blocks
app.get("/codeblocks", async (req, res) => {
  const codeblocks = await CodeBlock.find().select("_id name");
  res.json(codeblocks);
});

// Socket.IO logic
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
    socket.emit("init", { role, currentCode: state.currentCode, numStudents });
    io.to(codeblockId).emit("updateStudents", numStudents);
  });

  socket.on("updateCode", ({ codeblockId, newCode }) => {
    const state = codeblockStates[codeblockId];
    state.currentCode = newCode;
    io.to(codeblockId).emit("codeUpdated", newCode);

    // Remove all whitespace and normalize quotes
    const normalizeCode = (code) => code.replace(/\s/g, "").replace(/'/g, '"');
    const studentCodeNormalized = normalizeCode(newCode);
    const solutionNormalized = normalizeCode(state.solution);

    console.log("Student Code (normalized):", studentCodeNormalized);
    console.log("Solution (normalized):", solutionNormalized);
    console.log("Match:", studentCodeNormalized === solutionNormalized);

    if (studentCodeNormalized === solutionNormalized) {
      console.log("Solution matched! Emitting event...");
      io.to(codeblockId).emit("solutionMatched");
    }
  });

  socket.on("disconnect", async () => {
    for (const codeblockId in codeblockStates) {
      const state = codeblockStates[codeblockId];
      if (state.mentorId === socket.id) {
        io.to(codeblockId).emit("mentorLeft");
        state.mentorId = null;
        const codeblock = await CodeBlock.findById(codeblockId);
        state.currentCode = codeblock.initialCode;
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
