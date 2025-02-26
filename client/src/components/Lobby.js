import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/Lobby.css"; // Updated import path

function Lobby() {
  const [codeblocks, setCodeblocks] = useState([]);

  useEffect(() => {
    fetch("https://moveo-task-backend-y1t6.onrender.com/codeblocks")
      .then((res) => res.json())
      .then((data) => setCodeblocks(data));
  }, []);

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
