// Express server with more complete functionality
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load environment variables
try {
  require('dotenv').config();
  console.log('Environment variables loaded from .env');
} catch (error) {
  console.log('Error loading .env file:', error.message);
  console.log('Using system environment variables');
}

const app = express();

// Basic middleware
app.use(express.json());

// CORS setup
const corsOptions = {
  origin: '*', // Allow all origins for testing
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
console.log('CORS middleware configured');

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Express server is running',
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString()
  });
});

// Environment variables endpoint (for debugging)
app.get('/api/env', (req, res) => {
  // Only show non-sensitive environment variables
  const safeEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    WEBSITE_SITE_NAME: process.env.WEBSITE_SITE_NAME,
    // Indicate if sensitive variables are set without revealing values
    REACT_APP_CONVERSATION_FUNCTION_URL: process.env.REACT_APP_CONVERSATION_FUNCTION_URL ? 'set' : 'not set',
    REACT_APP_FUNCTION_KEY: process.env.REACT_APP_FUNCTION_KEY ? 'set (redacted)' : 'not set'
  };
  
  res.json(safeEnv);
});

// File system check endpoint (for debugging)
app.get('/api/files', (req, res) => {
  const rootDir = path.resolve('.');
  
  try {
    const files = fs.readdirSync(rootDir);
    const fileDetails = files.map(file => {
      const filePath = path.join(rootDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime
      };
    });
    
    res.json({
      currentDirectory: rootDir,
      files: fileDetails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Express Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #0066cc; }
          .container { max-width: 800px; margin: 0 auto; }
          .status { padding: 20px; background-color: #e6f7ff; border-left: 5px solid #0066cc; margin-bottom: 20px; }
          .endpoints { background-color: #f9f9f9; padding: 20px; border-left: 5px solid #666; }
          .endpoint { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Express Server (Full Version)</h1>
          <div class="status">
            <p><strong>Status:</strong> Running</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
            <p><strong>Server Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <h2>Available Endpoints</h2>
          <div class="endpoints">
            <div class="endpoint"><a href="/api/health">/api/health</a> - Check server health</div>
            <div class="endpoint"><a href="/api/env">/api/env</a> - View environment variables</div>
            <div class="endpoint"><a href="/api/files">/api/files</a> - View files in root directory</div>
          </div>
          
          <p>The server is working correctly with Express, CORS, and environment variables.</p>
        </div>
      </body>
    </html>
  `);
});

// Catch-all for 404s
app.use((req, res) => {
  res.status(404).send('Not found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).send('Server error');
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Express server (full version) running on port ${port}`);
});
