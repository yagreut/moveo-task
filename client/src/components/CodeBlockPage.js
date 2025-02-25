import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

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

    // Cleanup: Emit leaveRoom when component unmounts (navigating away)
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
    <div style={{ padding: "20px" }}>
      <h2>Code Block</h2>
      <p>Role: {role}</p>
      <p>Number of Students: {numStudents}</p>
      <CodeMirror
        value={code}
        height="200px"
        extensions={[javascript()]}
        onChange={handleCodeChange}
        readOnly={role === "mentor"}
        theme="dark"
      />
      {showSmiley && (
        <div
          style={{ fontSize: "50px", textAlign: "center", marginTop: "20px" }}
        >
          😊
        </div>
      )}
      <div style={{ marginTop: "20px" }}>
        <h3>Chat</h3>
        <div
          style={{
            maxHeight: "150px",
            overflowY: "auto",
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          {messages.map((msg, index) => (
            <div key={index}>
              <strong>
                {msg.id === socket.id ? "You" : msg.id.slice(0, 4)}:
              </strong>{" "}
              {msg.message}{" "}
              <em>({new Date(msg.timestamp).toLocaleTimeString()})</em>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          style={{ width: "70%", marginRight: "10px" }}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}

export default CodeBlockPage;
