const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients and workspace data
const clients = new Set();
const boxes = {};
let nextBoxId = 1;

// Handle WebSocket connections
wss.on('connection', (ws) => {
  // Add new client to the set
  clients.add(ws);
  console.log('New client connected! Total clients:', clients.size);
  
  // Send existing boxes data to the new client
  ws.send(JSON.stringify({
    type: 'init',
    boxes: boxes
  }));

  // Handle messages from clients
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Received:', data);
    
    switch(data.type) {
      case 'add_box':
        // Create a new box with unique ID
        const boxId = `box-${nextBoxId++}`;
        boxes[boxId] = {
          id: boxId,
          color: data.color,
          text: data.text,
          position: data.position,
          createdBy: data.userId
        };
        
        // Broadcast the new box to all clients
        broadcastToAll({
          type: 'box_added',
          box: boxes[boxId]
        });
        break;
        
      case 'move_box':
        // Update box position
        if (boxes[data.boxId]) {
          boxes[data.boxId].position = data.position;
          
          // Broadcast the move to all clients
          broadcastToAll({
            type: 'box_moved',
            boxId: data.boxId,
            position: data.position
          });
        }
        break;
        
      case 'delete_box':
        // Delete a box
        if (boxes[data.boxId]) {
          delete boxes[data.boxId];
          
          // Broadcast the deletion to all clients
          broadcastToAll({
            type: 'box_deleted',
            boxId: data.boxId
          });
        }
        break;
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected! Remaining clients:', clients.size);
  });
});

// Function to broadcast messages to all connected clients
function broadcastToAll(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// API endpoint for box status (optional)
app.get('/api/boxes', (req, res) => {
  res.json(boxes);
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});