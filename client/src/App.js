
import React, { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import './App.css';

function App() {
  const [connected, setConnected] = useState(false);
  const [boxes, setBoxes] = useState({});
  const [newBoxText, setNewBoxText] = useState('');
  const [selectedBox, setSelectedBox] = useState(null);
  const [userId] = useState(nanoid(8)); // Generate a unique user ID
  const wsRef = useRef(null);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  // Connect to WebSocket server
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);

      switch (data.type) {
        case 'init':
          setBoxes(data.boxes);
          break;
        case 'box_added':
          setBoxes(prev => ({
            ...prev,
            [data.box.id]: data.box
          }));
          break;
        case 'box_moved':
          setBoxes(prev => ({
            ...prev,
            [data.boxId]: {
              ...prev[data.boxId],
              position: data.position
            }
          }));
          break;
        case 'box_deleted':
          setBoxes(prev => {
            const newBoxes = { ...prev };
            delete newBoxes[data.boxId];
            return newBoxes;
          });
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Handle creating a new box
  const handleAddBox = () => {
    if (!newBoxText.trim() || !connected) return;

    const randomColor = getRandomColor();
    const position = {
      x: Math.random() * (window.innerWidth - 200) + 100,
      y: Math.random() * (window.innerHeight - 200) + 100
    };

    wsRef.current.send(JSON.stringify({
      type: 'add_box',
      userId,
      text: newBoxText,
      color: randomColor,
      position
    }));

    setNewBoxText('');
  };

  // Handle starting drag operation
  const handleMouseDown = (e, boxId) => {
    if (!connected) return;
    
    setSelectedBox(boxId);
    const box = document.getElementById(boxId);
    const rect = box.getBoundingClientRect();
    
    // Calculate offset from the mouse position to the box corner
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    dragRef.current = boxId;
    e.preventDefault();
  };

  // Handle dragging
  const handleMouseMove = (e) => {
    if (!dragRef.current || !connected) return;
    
    const position = {
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y
    };

    // Update local state immediately for smooth dragging
    setBoxes(prev => ({
      ...prev,
      [dragRef.current]: {
        ...prev[dragRef.current],
        position
      }
    }));
  };

  // Handle end of drag operation
  const handleMouseUp = () => {
    if (!dragRef.current || !connected) return;
    
    // Send the final position to the server
    wsRef.current.send(JSON.stringify({
      type: 'move_box',
      boxId: dragRef.current,
      position: boxes[dragRef.current].position
    }));
    
    dragRef.current = null;
    setSelectedBox(null);
  };

  // Handle box deletion
  const handleDeleteBox = (boxId) => {
    if (!connected) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'delete_box',
      boxId
    }));
  };

  // Generate a random color
  const getRandomColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#073B4C'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div 
      className="app"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <header className="header">
        <h1>Collaborative Workspace</h1>
        <div className="connection-status">
          {connected ? (
            <span className="status-connected">Connected</span>
          ) : (
            <span className="status-disconnected">Disconnected</span>
          )}
        </div>
      </header>

      <div className="controls">
        <input
          type="text"
          value={newBoxText}
          onChange={(e) => setNewBoxText(e.target.value)}
          placeholder="Enter box text..."
          className="text-input"
          onKeyPress={(e) => e.key === 'Enter' && handleAddBox()}
        />
        <button 
          onClick={handleAddBox}
          disabled={!connected || !newBoxText.trim()}
          className="add-button"
        >
          Add Box
        </button>
      </div>

      <div className="workspace">
        {Object.values(boxes).map((box) => (
          <div
            key={box.id}
            id={box.id}
            className={`box ${selectedBox === box.id ? 'selected' : ''}`}
            style={{
              backgroundColor: box.color,
              left: box.position.x,
              top: box.position.y,
            }}
            onMouseDown={(e) => handleMouseDown(e, box.id)}
          >
            <div className="box-content">{box.text}</div>
            <button 
              className="delete-button"
              onClick={() => handleDeleteBox(box.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <footer className="footer">
        <p>Your ID: {userId} | Connected Users: {connected ? 'Online' : 'Offline'}</p>
      </footer>
    </div>
  );
}

export default App;