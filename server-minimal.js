/**
 * Minimal server for Azure App Service
 * This is a fallback server that doesn't rely on express
 * It will be used if the main server fails to start due to missing dependencies
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  // Simple API endpoint to check if server is running
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      message: 'Minimal server is running',
      environment: process.env.NODE_ENV || 'production',
      time: new Date().toISOString(),
      // List some environment variables (redacting sensitive values)
      env: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        PORT: process.env.PORT || 'not set',
        WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME || 'not set',
        REACT_APP_CONVERSATION_FUNCTION_URL: process.env.REACT_APP_CONVERSATION_FUNCTION_URL ? 'set' : 'not set',
        REACT_APP_FUNCTION_KEY: process.env.REACT_APP_FUNCTION_KEY ? 'set (redacted)' : 'not set'
      },
      // Check for critical files
      files: {
        'package.json': fs.existsSync(path.join(__dirname, 'package.json')),
        '.env': fs.existsSync(path.join(__dirname, '.env')),
        'node_modules': fs.existsSync(path.join(__dirname, 'node_modules')),
        'node_modules/express': fs.existsSync(path.join(__dirname, 'node_modules', 'express'))
      }
    }));
    return;
  }
  
  // Try to load the main server if possible
  try {
    // Check if express is available
    try {
      const express = require('express');
      console.log('Express module found, attempting to load main server...');
      
      try {
        // Try to load the main server
        const mainServer = require('./server');
        console.log('Main server loaded successfully, redirecting request...');
        
        // Pass the request to the main server
        mainServer(req, res);
        return;
      } catch (mainServerError) {
        console.error('Failed to load main server:', mainServerError);
        // Continue to fallback response
      }
    } catch (expressError) {
      console.error('Express module not found:', expressError.message);
      // Continue to fallback response
    }
    
    // Fallback response
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>RTS AI - Minimal Server</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; }
            .container { max-width: 800px; margin: 0 auto; }
            .error { color: #cc0000; background-color: #ffeeee; padding: 10px; border-radius: 5px; }
            .info { color: #006600; background-color: #eeffee; padding: 10px; border-radius: 5px; }
            pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>RTS AI - Minimal Server</h1>
            <div class="error">
              <h2>Dependency Error</h2>
              <p>The main server could not be started due to missing dependencies. This is a minimal fallback server.</p>
            </div>
            <div class="info">
              <h2>Troubleshooting</h2>
              <p>Check the <a href="/api/health">health endpoint</a> for more information about the environment.</p>
              <p>Make sure the following dependencies are installed:</p>
              <ul>
                <li>express</li>
                <li>cors</li>
                <li>dotenv</li>
                <li>node-fetch</li>
                <li>uuid</li>
              </ul>
            </div>
          </div>
        </body>
        </html>
      `);
      return;
    }
    
    // Handle 404 for other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (error) {
    console.error('Error handling request:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
  console.log('This is a fallback server due to missing dependencies');
  console.log(`Check http://localhost:${PORT}/api/health for environment information`);
});

// Export the server for iisnode
module.exports = server;
