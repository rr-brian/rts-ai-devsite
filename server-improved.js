/**
 * Improved server entry point with better error handling and iisnode compatibility
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Import modules with error handling
function safeRequire(modulePath, fallback) {
  try {
    console.log(`Loading module: ${modulePath}`);
    return require(modulePath);
  } catch (error) {
    console.error(`Failed to load module ${modulePath}:`, error.message);
    return fallback || null;
  }
}

// Load modules with fallbacks
const config = safeRequire('./config', { loadConfig: () => console.log('Using fallback config loader') });
const middlewareSetup = safeRequire('./middleware/setup', { 
  setupMiddleware: (app) => {
    console.log('Using fallback middleware setup');
    // Basic CORS middleware
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
    // Basic request logging
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });
  }
});
const apiRoutes = safeRequire('./routes/api', express.Router());
const conversationRoutes = safeRequire('./routes/conversations', express.Router());

// Load environment variables
console.log('Loading environment variables from config module...');
if (config && typeof config.loadConfig === 'function') {
  config.loadConfig();
} else {
  // Fallback for loading .env file
  try {
    const dotenv = require('dotenv');
    const envPath = path.join(__dirname, '.env');
    const altEnvPath = path.join(__dirname, '..', 'rts-ai-dev', '.env');
    
    console.log(`Looking for .env file at: ${envPath}`);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log('.env file loaded successfully');
    } else {
      console.log(`Looking for alternative .env file at: ${altEnvPath}`);
      if (fs.existsSync(altEnvPath)) {
        dotenv.config({ path: altEnvPath });
        console.log('Alternative .env file loaded successfully');
      } else {
        console.log('No .env file found, using environment variables from the system');
      }
    }
  } catch (error) {
    console.error('Error loading .env file:', error.message);
  }
}

// Log environment variables (redacting sensitive values)
function logEnvironmentVariables() {
  console.log('Environment variables loaded:');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('PORT:', process.env.PORT || 'not set (using default 3000)');
  console.log('WEBSITE_SITE_NAME:', process.env.WEBSITE_SITE_NAME || 'not set');
  console.log('REACT_APP_CONVERSATION_FUNCTION_URL:', process.env.REACT_APP_CONVERSATION_FUNCTION_URL ? 'set' : 'not set');
  console.log('REACT_APP_FUNCTION_KEY:', process.env.REACT_APP_FUNCTION_KEY ? 'set (redacted)' : 'not set');
  console.log('Current directory:', __dirname);
}

logEnvironmentVariables();

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

// Configure middleware
if (middlewareSetup && typeof middlewareSetup.setupMiddleware === 'function') {
  middlewareSetup.setupMiddleware(app);
  console.log('Full middleware setup loaded successfully');
} else {
  console.warn('Using minimal middleware setup');
  // Basic CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
  // Basic request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });
}

// Mount API routes if available
if (apiRoutes) {
  app.use('/api', apiRoutes);
  console.log('API routes loaded successfully');
} else {
  console.warn('API routes not available');
}

// Mount conversation routes if available
if (conversationRoutes) {
  app.use('/api/conversations', conversationRoutes);
  console.log('Conversation routes loaded successfully');
} else {
  console.warn('Conversation routes not available');
}

// Add debugging endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version
  });
});

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
    arch: process.arch
  });
});

app.get('/api/files', (req, res) => {
  const dirPath = req.query.path || __dirname;
  
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

// Very simple test endpoint that should always work
app.get('/test', (req, res) => {
  console.log('Simple test endpoint called');
  res.send('Test endpoint is working');
});

// Serve static files from the React app build directory if it exists
const buildPath = path.join(__dirname, 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  console.log('Serving static files from build directory');
} else {
  console.log('Build directory not found, static files will not be served');
}

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
      // Fallback if index.html doesn't exist - serve a status page instead
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
              <div class="endpoint">
                <p><a href="/test">/test</a> - Simple test endpoint</p>
              </div>
            </div>
            
            <div class="card">
              <h2>Missing React App</h2>
              <p class="warning">The React app build directory was not found.</p>
              <p>Please build the React app and deploy it to the build directory.</p>
            </div>
          </body>
        </html>
      `);
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    path: req.url
  });
});

// Create HTTP server
const server = http.createServer(app);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Static files served from: ${path.join(__dirname, 'build')}`);
  console.log('Server started successfully');
});

// Export the app for iisnode and other modules
module.exports = app;
