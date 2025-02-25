import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import "../styles/CodeBlockPage.css"; // Updated import path

const socket = io("http://localhost:5000");

function CodeBlockPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [code, setCode] = useState("");
  const [numStudents, setNumStudents] = useState(0);
  const [showSmiley, setShowSmiley] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit("join", id);

    socket.on("init", ({ role, currentCode, numStudents, messages }) => {
      setRole(role);
      setCode(currentCode);
      setNumStudents(numStudents);
      setMessages(messages || []);
    });

    socket.on("codeUpdated", (newCode) => setCode(newCode));

    socket.on("updateStudents", (num) => setNumStudents(num));

    socket.on("solutionMatched", () => setShowSmiley(true));

    socket.on("mentorLeft", () => {
      alert("Mentor has left. Returning to lobby.");
      navigate("/");
    });

    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCodeChange = (value) => {
    if (role === "student") {
      setCode(value);
      socket.emit("updateCode", { codeblockId: id, newCode: value });
    }
  };

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      socket.emit("sendMessage", { codeblockId: id, message: chatInput });
      setChatInput("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

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
