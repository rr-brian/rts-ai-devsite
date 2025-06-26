// This file is a special handler for API routes
// It will be referenced directly in web.config

const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic logging
app.use((req, res, next) => {
  console.log(`API Route Handler: ${req.method} ${req.url}`);
  console.log(`Original URL: ${req.originalUrl}, Path: ${req.path}`);
  console.log(`Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// Simple health check endpoint
app.get('*/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'API routes are working correctly!'
  });
});

// Debug routes endpoint
app.get('*/debug-routes', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    request: {
      url: req.url,
      method: req.method,
      path: req.path,
      headers: req.headers
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development'
    },
    message: 'API debug routes endpoint is working!'
  });
});

// Test SQL endpoint (mock version)
app.get('*/test-sql', (req, res) => {
  res.json({
    status: 'success',
    message: 'This is a mock SQL response from the dedicated API handler',
    timestamp: new Date().toISOString()
  });
});

// Catch-all for unhandled API routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API routes handler running on port ${PORT}`);
});
