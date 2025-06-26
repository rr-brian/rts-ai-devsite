/**
 * Main API routes
 */
const express = require('express');
const router = express.Router();

// Import sub-routers
let conversationsRouter;
try {
  conversationsRouter = require('../server/api/conversations');
  console.log('Conversations router loaded successfully');
} catch (error) {
  console.warn('Conversations router not available:', error.message);
  // Create a simple router fallback
  conversationsRouter = express.Router();
  conversationsRouter.get('/', (req, res) => {
    res.json({ error: 'Conversations API not available' });
  });
}

const azureOpenAIRouter = require('./azure-openai');
const { getClientConfig, getApiConfig } = require('../config');

// Mount sub-routers
router.use('/conversations', conversationsRouter);
router.use('/azure-openai', azureOpenAIRouter);

// Create an endpoint to expose environment variables to the client
router.get('/react-config', (req, res) => {
  console.log('React config endpoint called');
  res.json(getClientConfig());
});

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('Health check endpoint called');
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

// Config endpoint
router.get('/config', (req, res) => {
  console.log('Config endpoint called');
  res.json(getApiConfig());
});

// Very simple test endpoint that should always work
router.get('/test', (req, res) => {
  console.log('Simple test endpoint called');
  res.send('Test endpoint is working');
});

// Diagnostic endpoint to help debug routing issues
router.get('/debug-routes', (req, res) => {
  console.log('Debug routes endpoint called');
  // Return information about the request and environment
  res.json({
    timestamp: new Date().toISOString(),
    request: {
      url: req.url,
      method: req.method,
      path: req.path,
      headers: req.headers
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT || 3000
    },
    apiEndpoints: [
      '/api/react-config',
      '/api/health',
      '/api/config',
      '/api/conversations',
      '/api/test',
      '/api/azure-openai',
      '/api/debug-routes'
    ]
  });
});

// API test route removed

module.exports = router;
