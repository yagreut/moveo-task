import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

function Lobby() {
  const [codeblocks, setCodeblocks] = useState([]);

  useEffect(() => {
    // Fetch code blocks from server
    fetch("http://localhost:5000/codeblocks")
      .then((res) => res.json())
      .then((data) => setCodeblocks(data));
  }, []);

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Choose Code Block</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {codeblocks.map((cb) => (
          <li key={cb._id} style={{ margin: "10px" }}>
            <Link
              to={`/codeblock/${cb._id}`}
              style={{ textDecoration: "none", color: "#007bff" }}
            >
              {cb.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Lobby;
