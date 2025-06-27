/**
 * Simple entry point for iisnode
 */

console.log('Starting app.js entry point');

// Create a simple HTTP server
const http = require('http');
let app;

try {
  // Try to load the Express app
  console.log('Attempting to load server-fixed.js');
  app = require('./server-fixed');
  console.log('Server module loaded successfully');
} catch (error) {
  console.error('Failed to load server module:', error);
  
  // Create a minimal fallback Express app
  console.log('Creating fallback Express app');
  try {
    const express = require('express');
    app = express();
    
    // Add basic middleware
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });
    
    // Add a health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'Fallback server is running' });
    });
    
    // Add a root endpoint
    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>Fallback Server</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              h1 { color: #0066cc; }
              pre { background: #f8f8f8; padding: 15px; border-left: 5px solid #0066cc; }
            </style>
          </head>
          <body>
            <h1>Fallback Server</h1>
            <p>The main server module failed to load. This is a fallback server.</p>
            <p>Available endpoints:</p>
            <ul>
              <li><a href="/api/health">/api/health</a> - Health check endpoint</li>
            </ul>
          </body>
        </html>
      `);
    });
    
    console.log('Fallback Express app created successfully');
  } catch (expressError) {
    console.error('Failed to create fallback Express app:', expressError);
    
    // Create an even more minimal HTTP server
    app = (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head>
            <title>Minimal Server</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              h1 { color: #cc0000; }
              pre { background: #f8f8f8; padding: 15px; border-left: 5px solid #cc0000; }
            </style>
          </head>
          <body>
            <h1>Minimal HTTP Server</h1>
            <p>Both the main server and fallback Express server failed to load.</p>
            <p>Original error:</p>
            <pre>${error.stack || error.message}</pre>
            <p>Express error:</p>
            <pre>${expressError.stack || expressError.message}</pre>
          </body>
        </html>
      `);
    };
    console.log('Created minimal HTTP request handler');
  }
}

// Create and start the HTTP server
const server = http.createServer(app);
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

