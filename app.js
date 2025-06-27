/**
 * Simple entry point for iisnode
 */

console.log('Starting app.js entry point');

try {
  // Load the server module
  const app = require('./server-fixed');
  console.log('Server module loaded successfully');
  
  // Export the app for iisnode
  module.exports = app;
} catch (error) {
  console.error('Failed to load server module:', error);
  
  // Create a minimal fallback server
  const http = require('http');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head>
          <title>Server Error</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #cc0000; }
            pre { background: #f8f8f8; padding: 15px; border-left: 5px solid #cc0000; }
          </style>
        </head>
        <body>
          <h1>Server Error</h1>
          <p>The server encountered an error while starting:</p>
          <pre>${error.stack || error.message}</pre>
        </body>
      </html>
    `);
  });
  
  // Start the fallback server
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Fallback server running on port ${port}`);
  });
  
  // Export the fallback server
  module.exports = server;
}
