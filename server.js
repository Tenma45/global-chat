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
const clients = new Map();

wss.on('connection', (socket) => {
  socket.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'name') {
      if ([...clients.values()].includes(message.name)) {
        socket.send(JSON.stringify({ type: 'error', message: 'Name already taken. Please choose a different name.' }));
      } else {
        clients.set(socket, message.name);
        broadcastNames();
      }
    } else if (message.type === 'chat') {
      const name = clients.get(socket);
      const chatMessage = { name, message: message.message };
      broadcast(JSON.stringify({ type: 'chat', data: chatMessage }));
    } else if (message.type === 'kick') {
      broadcast(JSON.stringify({ type: 'kick' }));
      clients.clear();
    }
  });

  socket.on('close', () => {
    clients.delete(socket);
    broadcastNames();
  });

  socket.send(JSON.stringify({ type: 'welcome', message: 'Welcome to the global chat!' }));
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function broadcastNames() {
  const names = Array.from(clients.values());
  broadcast(JSON.stringify({ type: 'names', data: names }));
}

server.listen(8080, () => {
  console.log('Server is listening on http://localhost:8080');
});