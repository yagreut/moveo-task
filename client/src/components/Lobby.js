/**
 * Lobby component for displaying a list of code blocks and allowing users to join them.
 * Fetches code blocks from the backend API and renders them as clickable links.
 * @component
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/Lobby.css";

function Lobby() {
  // State to store code blocks fetched from the backend
  const [codeblocks, setCodeblocks] = useState([]);

  /**
   * Fetches code blocks from the backend on component mount.
   * Handles errors by logging them to the console.
   */
  useEffect(() => {
    fetch("https://moveo-task-backend-y1t6.onrender.com/codeblocks")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setCodeblocks(data))
      .catch((error) => console.error("Error fetching code blocks:", error));
  }, []);

  // Renders the lobby UI with a title and list of code blocks
  return (
    <div className="lobby-container">
      <h1 className="lobby-title">Choose Code Block</h1>
      <ul className="codeblock-list">
        {codeblocks.map((cb) => (
          <li key={cb._id} className="codeblock-item">
            <Link to={`/codeblock/${cb._id}`} className="codeblock-link">
              {cb.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Lobby;
