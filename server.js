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
const votes = new Map();

wss.on('connection', (socket) => {
  socket.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'name') {
      if ([...clients.values()].includes(message.name)) {
        socket.send(JSON.stringify({ type: 'error', message: 'Name already taken. Please choose a different name.' }));
      } else {
        clients.set(socket, message.name);
        votes.set(message.name, 'No Vote');
        broadcastNames();
      }
    } else if (message.type === 'chat') {
      const name = clients.get(socket);
      const chatMessage = { name, message: message.message };
      broadcast(JSON.stringify({ type: 'chat', data: chatMessage }));
    } else if (message.type === 'kick') {
      broadcast(JSON.stringify({ type: 'kick' }));
      clients.clear();
      votes.clear();
    } else if (message.type === 'vote') {
      const name = clients.get(socket);
      votes.set(name, message.name);
    } else if (message.type === 'showVotes') {
      const voteResults = Array.from(votes.entries()).map(([voter, votedFor]) => `${voter} voted for ${votedFor}`).join('\n');
      broadcast(JSON.stringify({ type: 'chat', data: { name: 'System', message: voteResults.replace(/\n/g, '<br>') } }));
    } else if (message.type === 'showVoteResult') {
      const voteCounts = {};
      votes.forEach((votedFor) => {
        voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
      });
      const voteResultMessage = Object.entries(voteCounts).map(([votedFor, count]) => `${count} voted for ${votedFor}`).join('\n');
      broadcast(JSON.stringify({ type: 'chat', data: { name: 'System', message: voteResultMessage.replace(/\n/g, '<br>') } }));
    }
  });

  socket.on('close', () => {
    const name = clients.get(socket);
    clients.delete(socket);
    votes.delete(name);
    broadcastNames();
  });

  socket.send(JSON.stringify({ type: 'welcome', message: "Welcome to Don't Vote Me!" }));
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