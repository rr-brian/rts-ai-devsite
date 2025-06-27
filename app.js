/**
 * Enhanced entry point for iisnode with better debugging and error handling
 */

console.log('Starting app.js entry point');

// Create a simple HTTP server
const http = require('http');
const fs = require('fs');
const path = require('path');
let app;

// Log environment variables (redacting sensitive values)
function logEnvironmentVariables() {
  console.log('Environment variables:');
  const sensitiveKeys = ['KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PWD'];
  
  Object.keys(process.env).forEach(key => {
    const isSensitive = sensitiveKeys.some(sk => key.toUpperCase().includes(sk));
    console.log(`${key}: ${isSensitive ? '[REDACTED]' : process.env[key]}`);
  });
}

logEnvironmentVariables();

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
    const cors = require('cors');
    app = express();
    
    // Enable CORS
    app.use(cors());
    
    // Request logging middleware
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      console.log(`Request headers: ${JSON.stringify(req.headers)}`);
      console.log(`Request path: ${req.path}, originalUrl: ${req.originalUrl}`);
      next();
    });
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        message: 'Fallback server is running',
        timestamp: new Date().toISOString(),
        mode: 'fallback'
      });
    });
    
    // Environment variables endpoint (redacting sensitive values)
    app.get('/api/env', (req, res) => {
      const sensitiveKeys = ['KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PWD'];
      const env = {};
      
      Object.keys(process.env).forEach(key => {
        const isSensitive = sensitiveKeys.some(sk => key.toUpperCase().includes(sk));
        env[key] = isSensitive ? '[REDACTED]' : process.env[key];
      });
      
      res.json({
        environment: env,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage()
      });
    });
    
    // File system explorer endpoint
    app.get('/api/files', (req, res) => {
      const dirPath = req.query.path || process.cwd();
      
      try {
        const files = fs.readdirSync(dirPath);
        const fileDetails = files.map(file => {
          const filePath = path.join(dirPath, file);
          try {
            const stats = fs.statSync(filePath);
            return {
              name: file,
              path: filePath,
              isDirectory: stats.isDirectory(),
              size: stats.size,
              modified: stats.mtime
            };
          } catch (err) {
            return {
              name: file,
              path: filePath,
              error: err.message
            };
          }
        });
        
        res.json({
          currentDirectory: dirPath,
          files: fileDetails
        });
      } catch (err) {
        res.status(500).json({
          error: err.message,
          path: dirPath
        });
      }
    });
    
    // Root endpoint with status and links
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Azure Node.js Server Status</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              h1 { color: #0066cc; }
              h2 { color: #333; margin-top: 30px; }
              pre { background: #f8f8f8; padding: 15px; border-left: 5px solid #0066cc; overflow: auto; }
              .card { background: #f8f8f8; border-radius: 5px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .success { color: #008000; }
              .warning { color: #ffa500; }
              .error { color: #cc0000; }
              .endpoint { margin-bottom: 10px; }
              .endpoint a { color: #0066cc; text-decoration: none; }
              .endpoint a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h1>Azure Node.js Server Status</h1>
            
            <div class="card">
              <h2>Server Information</h2>
              <p><strong>Status:</strong> <span class="success">Running</span></p>
              <p><strong>Mode:</strong> Fallback Express Server</p>
              <p><strong>Time:</strong> ${new Date().toISOString()}</p>
              <p><strong>Node.js Version:</strong> ${process.version}</p>
              <p><strong>Platform:</strong> ${process.platform} (${process.arch})</p>
            </div>
            
            <div class="card">
              <h2>Available Endpoints</h2>
              <div class="endpoint">
                <p><a href="/api/health">/api/health</a> - Health check endpoint</p>
              </div>
              <div class="endpoint">
                <p><a href="/api/env">/api/env</a> - Environment variables (sensitive values redacted)</p>
              </div>
              <div class="endpoint">
                <p><a href="/api/files">/api/files</a> - File system explorer</p>
              </div>
            </div>
            
            <div class="card">
              <h2>Troubleshooting</h2>
              <p>The main server module failed to load. This is a fallback server.</p>
              <p>Check the logs for more information about the error.</p>
            </div>
          </body>
        </html>
      `);
    });
    
    // 404 handler
    app.use((req, res) => {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>404 - Not Found</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              h1 { color: #cc0000; }
              pre { background: #f8f8f8; padding: 15px; border-left: 5px solid #cc0000; }
              a { color: #0066cc; }
            </style>
          </head>
          <body>
            <h1>404 - Not Found</h1>
            <p>The requested resource was not found: ${req.originalUrl}</p>
            <p><a href="/">Return to home</a></p>
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
        <!DOCTYPE html>
        <html>
          <head>
            <title>Minimal Server</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
              h1 { color: #cc0000; }
              pre { background: #f8f8f8; padding: 15px; border-left: 5px solid #cc0000; overflow: auto; }
            </style>
          </head>
          <body>
            <h1>Minimal HTTP Server</h1>
            <p>Both the main server and fallback Express server failed to load.</p>
            <h2>Original Error:</h2>
            <pre>${error.stack || error.message}</pre>
            <h2>Express Error:</h2>
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

