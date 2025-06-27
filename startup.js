/**
 * Startup script for Azure App Service
 * This script will check for required dependencies but won't attempt to install them
 * as that should be handled by the deployment process
 */
const fs = require('fs');
const path = require('path');

// List of critical dependencies to check
const criticalDependencies = [
  'express',
  'cors',
  'dotenv',
  'node-fetch',
  'uuid'
];

console.log('Starting server initialization...');

// Function to check if a module is installed
function isModuleInstalled(moduleName) {
  try {
    require.resolve(moduleName);
    return true;
  } catch (e) {
    return false;
  }
}

// Check for missing dependencies but don't try to install them
let missingDependencies = [];
for (const dependency of criticalDependencies) {
  if (!isModuleInstalled(dependency)) {
    console.log(`Warning: Dependency not found: ${dependency}`);
    missingDependencies.push(dependency);
  }
}

// Log missing dependencies but continue anyway
if (missingDependencies.length > 0) {
  console.warn(`Missing dependencies: ${missingDependencies.join(', ')}`);
  console.warn('Continuing startup process anyway - these should be installed via package.json');
}

// Start the server
console.log('Starting server...');

// Try to import the main server, fall back to minimal server if it fails
let server;
try {
  // Try to load express first to check if it's available
  try {
    require.resolve('express');
    console.log('Express module found, attempting to load main server...');
    server = require('./server.js');
    console.log('Main server loaded successfully');
  } catch (expressError) {
    console.error('Express module not found:', expressError.message);
    console.log('Loading minimal server as fallback...');
    server = require('./server-minimal.js');
    console.log('Minimal server loaded successfully');
  }
} catch (serverError) {
  console.error('Failed to load server:', serverError);
  console.log('Loading minimal server as fallback...');
  try {
    server = require('./server-minimal.js');
    console.log('Minimal server loaded successfully');
  } catch (minimalServerError) {
    console.error('Failed to load minimal server:', minimalServerError);
    // Create a very basic HTTP server as a last resort
    console.log('Creating basic HTTP server as last resort...');
    const http = require('http');
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Emergency fallback server - deployment issues detected');
    });
    // Start the emergency server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Emergency server running on port ${PORT}`);
    });
  }
}

// Export the app for iisnode
module.exports = server;
