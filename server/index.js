/**
 * Main server file for CodingSync, handling real-time coding collaboration via Socket.io,
 * API endpoints with Express.js, and MongoDB integration for storing code blocks.
 * @module server
 * @requires express
 * @requires http
 * @requires socket.io
 * @requires mongoose
 * @requires cors
 * @requires dotenv
 */

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

/**
 * Express application instance for handling HTTP requests.
 * @type {express.Application}
 */
const app = express();

/**
 * HTTP server instance wrapping the Express app for Socket.io integration.
 * @type {http.Server}
 */
const server = http.createServer(app);

/**
 * Socket.io server instance for real-time communication, configured with CORS.
 * @type {socketio.Server}
 */
const io = socketIo(server, {
  /**
   * CORS configuration allowing cross-origin requests from the frontend.
   * @property {string|Array<string>} origin - Allowed origin (e.g., frontend URL or '*')
   * @property {string[]} methods - HTTP methods allowed (e.g., GET, POST)
   * @property {boolean} credentials - Whether to include credentials in requests
   */
  cors: {
    origin: "https://moveo-task-frontend-1gbw.onrender.com",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware for parsing JSON and enabling CORS
app.use(cors());
app.use(express.json());

/**
 * Connects to MongoDB Atlas using the MONGO_URI environment variable, targeting the 'CodeBlocks' database.
 * @throws {Error} If the connection fails, logs the error.
 */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Import the CodeBlock model from the models directory
const CodeBlock = require("./models/CodeBlock");

/**
 * In-memory store for real-time state of code block rooms, including mentor, code, solution, and messages.
 * @type {Object.<string, Object>}
 */
const codeblockStates = {};

/**
 * API endpoint to fetch all code blocks, returning only _id and name.
 * @route GET /codeblocks
 * @returns {CodeBlock[]} Array of code blocks with _id and name from the 'CodeBlocks' collection.
 */
app.get("/codeblocks", async (req, res) => {
  const codeblocks = await CodeBlock.find().select("_id name");
  res.json(codeblocks);
});

/**
 * Socket.io connection handler, managing real-time events for coding collaboration.
 * @param {socketio.Socket} socket - The Socket.io connection instance.
 */
io.on("connection", (socket) => {
  /**
   * Handles a user joining a code block room, assigning roles and initializing state.
   * @param {string} codeblockId - The ID of the code block room to join.
   */
  socket.on("join", async (codeblockId) => {
    socket.join(codeblockId);

    if (!codeblockStates[codeblockId]) {
      const codeblock = await CodeBlock.findById(codeblockId);
      codeblockStates[codeblockId] = {
        mentorId: null,
        currentCode: codeblock ? codeblock.initialCode : "",
        solution: codeblock ? codeblock.solution : "",
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

  /**
   * Updates the current code in a code block room and checks for solution matches.
   * @param {Object} data - Event data containing codeblockId and newCode.
   * @param {string} data.codeblockId - The ID of the code block room.
   * @param {string} data.newCode - The updated code from the student.
   */
  socket.on("updateCode", ({ codeblockId, newCode }) => {
    const state = codeblockStates[codeblockId];
    state.currentCode = newCode;

    io.to(codeblockId).emit("codeUpdated", newCode);

    const normalizedStudentCode = newCode
      .replace(/\s/g, "")
      .replace(/'/g, '"')
      .replace(/\\/g, "");
    const normalizedSolution = state.solution
      .replace(/\s/g, "")
      .replace(/'/g, '"')
      .replace(/\\/g, "");
    if (normalizedStudentCode === normalizedSolution) {
      io.to(codeblockId).emit("solutionMatched");
    }
  });

  /**
   * Handles sending a chat message in a code block room, broadcasting it to all users.
   * @param {Object} data - Event data containing codeblockId and message.
   * @param {string} data.codeblockId - The ID of the code block room.
   * @param {string} data.message - The chat message to send.
   */
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

  /**
   * Handles a user leaving a code block room, resetting state if they are the mentor.
   * @param {string} codeblockId - The ID of the code block room to leave.
   */
  socket.on("leaveRoom", async (codeblockId) => {
    const state = codeblockStates[codeblockId];
    if (state && state.mentorId === socket.id) {
      io.to(codeblockId).emit("mentorLeft");
      const codeblock = await CodeBlock.findById(codeblockId);
      codeblockStates[codeblockId] = {
        mentorId: null,
        currentCode: codeblock ? codeblock.initialCode : "",
        solution: codeblock ? codeblock.solution : "",
        messages: [],
      };
    }
    socket.leave(codeblockId);
  });

  /**
   * Handles a user disconnecting, resetting the room state if they were the mentor.
   */
  socket.on("disconnect", async () => {
    for (const codeblockId in codeblockStates) {
      const state = codeblockStates[codeblockId];
      if (state.mentorId === socket.id) {
        io.to(codeblockId).emit("mentorLeft");
        const codeblock = await CodeBlock.findById(codeblockId);
        codeblockStates[codeblockId] = {
          mentorId: null,
          currentCode: codeblock ? codeblock.initialCode : "",
          solution: codeblock ? codeblock.solution : "",
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

/**
 * Starts the server, listening on the specified port.
 * @param {number} PORT - The port number to listen on (defaults to 5000 or process.env.PORT).
 */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
