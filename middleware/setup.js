/**
 * Middleware setup for Express application
 */
const express = require('express');
const cors = require('cors');

/**
 * Configure all middleware for the Express application
 * @param {Object} app - Express application instance
 */
function setupMiddleware(app) {
  // Configure CORS
  const { configureCors } = require('./cors');
  app.use(configureCors());
  
  // Request logging middleware
  const { requestLogger, apiLogger } = require('./logging');
  app.use(requestLogger);
  
  // API logging for specific routes
  app.use('/api', (req, res, next) => {
    console.log(`API request received: ${req.method} ${req.originalUrl}`);
    next();
  });
  app.use('/api', apiLogger);
  
  // Parse JSON request bodies
  app.use(express.json());
  
  // Parse URL-encoded request bodies
  app.use(express.urlencoded({ extended: true }));
}

module.exports = {
  setupMiddleware
};
