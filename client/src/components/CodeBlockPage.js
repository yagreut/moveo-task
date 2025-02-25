import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

// Connect to server (update URL for deployment)
const socket = io('http://localhost:5000');

function CodeBlockPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [code, setCode] = useState('');
  const [numStudents, setNumStudents] = useState(0);
  const [showSmiley, setShowSmiley] = useState(false);

  useEffect(() => {
    // Join the code block room
    socket.emit('join', id);

    // Initialize with role and code
    socket.on('init', ({ role, currentCode, numStudents }) => {
      setRole(role);
      setCode(currentCode);
      setNumStudents(numStudents);
    });

    // Update code from other users
    socket.on('codeUpdated', newCode => setCode(newCode));

    // Update student count
    socket.on('updateStudents', num => setNumStudents(num));

    // Show smiley when solution matches
    socket.on('solutionMatched', () => setShowSmiley(true));

    // Redirect to lobby if mentor leaves
    socket.on('mentorLeft', () => {
      alert('Mentor has left. Returning to lobby.');
      navigate('/');
    });

    // Cleanup on unmount
    return () => {
      socket.off('init');
      socket.off('codeUpdated');
      socket.off('updateStudents');
      socket.off('solutionMatched');
      socket.off('mentorLeft');
    };
  }, [id, navigate]);

  const handleCodeChange = (value) => {
    if (role === 'student') {
      setCode(value);
      socket.emit('updateCode', { codeblockId: id, newCode: value });
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Code Block</h2>
      <p>Role: {role}</p>
      <p>Number of Students: {numStudents}</p>
      <CodeMirror
        value={code}
        height="200px"
        extensions={[javascript()]}
        onChange={handleCodeChange}
        readOnly={role === 'mentor'}
        theme="dark"
      />
      {showSmiley && (
        <div style={{ fontSize: '50px', textAlign: 'center', marginTop: '20px' }}>
          😊
        </div>
      )}
    </div>
  );
}

export default CodeBlockPage;