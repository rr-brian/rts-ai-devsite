/**
 * Startup script to ensure dependencies are installed
 * This script will check for required dependencies and install them if missing
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// List of critical dependencies
const criticalDependencies = [
  'express',
  'cors',
  'dotenv',
  'mssql',
  'node-fetch',
  'path',
  'uuid'
];

console.log('Starting dependency check...');

// Function to check if a module is installed
function isModuleInstalled(moduleName) {
  try {
    require.resolve(moduleName);
    return true;
  } catch (e) {
    return false;
  }
}

// Check and install missing dependencies
let missingDependencies = [];
for (const dependency of criticalDependencies) {
  if (!isModuleInstalled(dependency)) {
    console.log(`Missing dependency: ${dependency}`);
    missingDependencies.push(dependency);
  }
}

// Install missing dependencies if any
if (missingDependencies.length > 0) {
  console.log(`Installing missing dependencies: ${missingDependencies.join(', ')}`);
  try {
    execSync(`npm install ${missingDependencies.join(' ')} --save`, { stdio: 'inherit' });
    console.log('Dependencies installed successfully');
  } catch (error) {
    console.error('Failed to install dependencies:', error);
    process.exit(1);
  }
}

// Start the server
console.log('Starting server...');
require('./server.js');
