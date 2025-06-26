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

// Import the server and export its app for IIS/iisnode
const server = require('./server.js');

// Export the app for iisnode
module.exports = server;
