// Minimal server.js to test iisnode
const http = require('http');

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from minimal Node.js server! Server is working.');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
