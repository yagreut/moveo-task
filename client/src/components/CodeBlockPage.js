/**
 * CodeBlockPage component for real-time coding collaboration within a specific code block.
 * Handles role assignment (mentor/student), live code updates, chat functionality,
 * and solution matching with a smiley face.
 * @component
 */

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import "../styles/CodeBlockPage.css";

// Initialize Socket.io connection to the backend
const socket = io("https://moveo-task-backend.onrender.com");

/**
 * Manages the state and real-time interactions for a code block page.
 * @param {Object} props - Component props (none directly passed, uses useParams).
 * @returns {JSX.Element} The rendered code block page UI.
 */
function CodeBlockPage() {
  const { id } = useParams(); // Get code block ID from URL
  const navigate = useNavigate();
  const [role, setRole] = useState(""); // User role (mentor/student)
  const [code, setCode] = useState(""); // Current code in the editor
  const [numStudents, setNumStudents] = useState(0); // Number of students in the room
  const [showSmiley, setShowSmiley] = useState(false); // Show smiley on solution match
  const [messages, setMessages] = useState([]); // Chat messages
  const [chatInput, setChatInput] = useState(""); // Chat input field
  const messagesEndRef = useRef(null); // Reference for auto-scrolling chat

  /**
   * Sets up Socket.io events on component mount and cleans up on unmount.
   * Handles initialization, code updates, student counts, solution matching,
   * mentor leaving, and chat messages.
   */
  useEffect(() => {
    socket.emit("join", id); // Join the code block room

    // Initialize with role, code, students, and messages
    socket.on("init", ({ role, currentCode, numStudents, messages }) => {
      setRole(role);
      setCode(currentCode || ""); // Default to empty if no code
      setNumStudents(numStudents);
      setMessages(messages || []);
    });

    // Update code in real-time
    socket.on("codeUpdated", (newCode) => setCode(newCode));

    // Update student count in real-time
    socket.on("updateStudents", (num) => setNumStudents(num));

    // Show smiley when solution matches
    socket.on("solutionMatched", () => setShowSmiley(true));

    // Handle mentor leaving, redirecting to lobby
    socket.on("mentorLeft", () => {
      alert("Mentor has left. Returning to lobby.");
      navigate("/");
    });

    // Handle new chat messages
    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Clean up Socket.io events and leave room on unmount
    return () => {
      socket.emit("leaveRoom", id);
      socket.off("init");
      socket.off("codeUpdated");
      socket.off("updateStudents");
      socket.off("solutionMatched");
      socket.off("mentorLeft");
      socket.off("newMessage");
    };
  }, [id, navigate]);

  /**
   * Auto-scrolls chat to the latest message when messages update.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Handles changes to the code editor, emitting updates if the user is a student.
   * @param {string} value - The new code value from the editor.
   */
  const handleCodeChange = (value) => {
    if (role === "student") {
      setCode(value);
      socket.emit("updateCode", { codeblockId: id, newCode: value });
    }
  };

  /**
   * Sends a chat message when the user submits it.
   */
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      socket.emit("sendMessage", { codeblockId: id, message: chatInput });
      setChatInput("");
    }
  };

  /**
   * Sends a chat message when the user presses Enter.
   * @param {KeyboardEvent} e - The keyboard event.
   */
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Render the code block page UI
  return (
    <div className="codeblock-container">
      <div className="editor-section">
        <h2 className="editor-title">Code Block</h2>
        <div className="editor-wrapper">
          <CodeMirror
            value={code}
            height="400px"
            extensions={[javascript()]}
            onChange={handleCodeChange}
            readOnly={role === "mentor"}
            theme="dark"
            className="code-mirror"
          />
        </div>
        {showSmiley && <div className="smiley">😊</div>}
      </div>

      <div className="info-chat-section">
        <div className="info-panel">
          <p className="info-text">
            <strong>Role:</strong> {role}
          </p>
          <p className="info-text">
            <strong>Students:</strong> {numStudents}
          </p>
        </div>
        <div className="chat-panel">
          <h3 className="chat-title">Chat</h3>
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${
                  msg.id === socket.id ? "own-message" : "other-message"
                }`}
              >
                <strong>
                  {msg.id === socket.id ? "You" : msg.id.slice(0, 4)}:
                </strong>{" "}
                {msg.message}
                <div className="chat-timestamp">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-section">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="chat-input"
            />
            <button onClick={handleSendMessage} className="chat-send-button">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodeBlockPage;
