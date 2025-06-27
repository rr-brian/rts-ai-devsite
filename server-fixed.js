/**
 * Modified server entry point with improved error handling
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Try to load environment variables, but don't fail if modules are missing
try {
  // First try to load from local config
  try {
    const { loadConfig } = require('./config');
    console.log('Loading environment variables from config module...');
    loadConfig();
  } catch (configError) {
    console.log('Config module not available, falling back to dotenv');
    // Fallback to direct dotenv loading
    try {
      require('dotenv').config();
      console.log('Environment variables loaded from .env');
    } catch (dotenvError) {
      console.log('Error loading .env file, using system environment variables');
    }
  }
} catch (error) {
  console.log('Error loading environment variables:', error.message);
  console.log('Using system environment variables');
}

// Log important environment variables (redacting sensitive values)
console.log('Environment variables loaded:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set (using default 3000)');
console.log('WEBSITE_SITE_NAME:', process.env.WEBSITE_SITE_NAME || 'not set');
console.log('REACT_APP_CONVERSATION_FUNCTION_URL:', process.env.REACT_APP_CONVERSATION_FUNCTION_URL ? 'set' : 'not set');
console.log('REACT_APP_FUNCTION_KEY:', process.env.REACT_APP_FUNCTION_KEY ? 'set (redacted)' : 'not set');
console.log('Current directory:', __dirname);

// Check for critical files
const criticalFiles = [
  path.join(__dirname, 'package.json'),
  path.join(__dirname, '.env'),
  path.join(__dirname, 'build', 'index.html')
];

console.log('Checking for critical files:');
criticalFiles.forEach(file => {
  console.log(`${file}: ${fs.existsSync(file) ? 'exists' : 'missing'}`);
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware setup that won't fail
try {
  // Parse JSON bodies
  app.use(express.json());
  
  // Enable CORS
  app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
  }));
  console.log('CORS module loaded successfully');
  
  // Log all requests
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
  
  // Try to load the full middleware setup
  try {
    const { setupMiddleware } = require('./middleware/setup');
    setupMiddleware(app);
    console.log('Full middleware setup loaded successfully');
  } catch (error) {
    console.error('Error loading middleware setup:', error.message);
    console.log('Using basic middleware only');
  }
} catch (error) {
  console.error('Error setting up basic middleware:', error.message);
}

// Health check endpoint that should always work
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
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
      try {
        const stats = fs.statSync(filePath);
        return {
          name: file,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        };
      } catch (error) {
        return {
          name: file,
          error: error.message
        };
      }
    });
    
    res.json({
      currentDirectory: rootDir,
      files: fileDetails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Try to load API routes
try {
  const apiRoutes = require('./routes/api');
  app.use('/api', apiRoutes);
  console.log('API routes loaded successfully');
} catch (error) {
  console.error('Error loading API routes:', error.message);
  // Provide a fallback API route
  app.get('/api', (req, res) => {
    res.json({ message: 'API is running but routes failed to load' });
  });
}

// Try to load conversation routes
try {
  const conversationRoutes = require('./routes/conversations');
  app.use('/api/conversations', conversationRoutes);
  console.log('Conversation routes loaded successfully');
} catch (error) {
  console.error('Error loading conversation routes:', error.message);
  // Provide a fallback conversation route
  app.get('/api/conversations', (req, res) => {
    res.json({ message: 'Conversation API is running but routes failed to load' });
  });
}

// Very simple test endpoint that should always work
app.get('/test', (req, res) => {
  console.log('Simple test endpoint called');
  res.send('Test endpoint is working');
});

// Serve static files from the React app build directory if it exists
try {
  const buildPath = path.join(__dirname, 'build');
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    console.log('Serving static files from:', buildPath);
  } else {
    console.log('Build directory not found, static files will not be served');
  }
} catch (error) {
  console.error('Error setting up static file serving:', error.message);
}

// Root endpoint with HTML status page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Server Status</title>
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
          <h1>Server Status</h1>
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
            <div class="endpoint"><a href="/test">/test</a> - Simple test endpoint</div>
          </div>
          
          <p>The server is working correctly.</p>
        </div>
      </body>
    </html>
  `);
});

// For any request that doesn't match an API route or static file,
// send the index.html file from the React app (SPA fallback)
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Try to serve the index.html file
  try {
    const indexPath = path.join(__dirname, 'build', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback if index.html doesn't exist
      res.status(404).send('Application not found. Please build the React app first.');
    }
  } catch (error) {
    console.error('Error serving SPA fallback:', error);
    res.status(500).send('Server Error: Could not serve application');
  }
});

// Add a catch-all handler for API routes that weren't matched
app.use('/api/*', (req, res) => {
  console.log(`API endpoint not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Server error',
    message: err.message,
    path: req.url
  });
});

// Start the server if not being imported by another module
if (require.main === module) {
  try {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('Server started successfully');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Log more details about the error
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
  }
}

// Export the app for iisnode and other modules
module.exports = app;
