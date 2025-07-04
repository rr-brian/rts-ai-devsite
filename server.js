/**
 * Main server entry point
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

// Import modules
const { loadConfig } = require('./config');
const { setupMiddleware } = require('./middleware/setup');
const apiRoutes = require('./routes/api');
const conversationRoutes = require('./routes/conversations');

// Load environment variables
console.log('Loading environment variables...');
loadConfig();

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

// Configure all middleware
setupMiddleware(app);

// Mount API routes
app.use('/api', apiRoutes);

// Mount conversation routes
app.use('/api/conversations', conversationRoutes);

// Very simple test endpoint that should always work
app.get('/test', (req, res) => {
  console.log('Simple test endpoint called');
  res.send('Test endpoint is working');
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

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

// Start the server if not being imported by another module
if (require.main === module) {
  try {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Static files served from: ${path.join(__dirname, 'build')}`);
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
