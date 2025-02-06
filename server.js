const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Create an HTTP server to serve the index.html file
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading index.html');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', socket => {
  console.log('New client connected');

  socket.on('message', message => {
    console.log('Received message:', message);

    // Broadcast the message to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  socket.send('Welcome to the global chat!');
});

server.listen(8080, () => {
  console.log('Server is listening on http://localhost:8080');
});