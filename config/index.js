/**
 * Configuration loader
 */
const path = require('path');
const fs = require('fs');

// Load environment variables
const loadConfig = () => {
  try {
    // Try to load dotenv
    try {
      const dotenv = require('dotenv');
      
      // Check if .env file exists in the current directory
      const envPath = path.resolve(__dirname, '../.env');
      // Also check in the rts-ai-development directory
      const altEnvPath = path.resolve(__dirname, '../../rts-ai-development/.env');
      
      console.log('Looking for .env file at:', envPath);
      console.log('Looking for alternative .env file at:', altEnvPath);
      
      if (fs.existsSync(envPath)) {
        // Load environment variables using dotenv
        dotenv.config({ path: envPath });
        console.log('Environment variables loaded from .env file');
      } else if (fs.existsSync(altEnvPath)) {
        // Load environment variables from the alternative path
        dotenv.config({ path: altEnvPath });
        console.log('Environment variables loaded from alternative .env file');
      } else {
        console.log('No .env file found, using environment variables from the system');
      }
    } catch (dotenvError) {
      console.warn('Dotenv module not available:', dotenvError.message);
      console.log('Using environment variables from the system');
    }
  } catch (error) {
    console.warn('Error loading environment variables:', error.message);
  }
};

// Get SQL configuration
const getSqlConfig = () => {
  return {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
  };
};

// Get client-safe configuration (no secrets)
const getClientConfig = () => {
  return {
    REACT_APP_AZURE_OPENAI_ENDPOINT: process.env.REACT_APP_AZURE_OPENAI_ENDPOINT,
    REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME: process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME,
    REACT_APP_AZURE_OPENAI_API_VERSION: process.env.REACT_APP_AZURE_OPENAI_API_VERSION,
    // Don't expose the API key directly, just indicate if it's set
    HAS_API_KEY: !!process.env.REACT_APP_AZURE_OPENAI_API_KEY,
    // Brokerage OpenAI config
    REACT_APP_BROKERAGE_OPENAI_ENDPOINT: process.env.REACT_APP_BROKERAGE_OPENAI_ENDPOINT,
    REACT_APP_BROKERAGE_OPENAI_DEPLOYMENT_NAME: process.env.REACT_APP_BROKERAGE_OPENAI_DEPLOYMENT_NAME,
    REACT_APP_BROKERAGE_OPENAI_API_VERSION: process.env.REACT_APP_BROKERAGE_OPENAI_API_VERSION,
    HAS_BROKERAGE_API_KEY: !!process.env.REACT_APP_BROKERAGE_OPENAI_API_KEY,
    // API URL
    REACT_APP_API_URL: process.env.REACT_APP_API_URL || ''
  };
};

// Get API configuration
const getApiConfig = () => {
  return {
    apiEndpoints: {
      conversations: '/api/conversations',
      azureOpenAI: '/api/azure-openai'
    },
    auth: {
      enabled: !!process.env.AZURE_AD_CLIENT_ID,
      provider: 'azure-ad'
    },
    features: {
      sqlEnabled: !!process.env.SQL_SERVER,
      openaiEnabled: !!process.env.AZURE_OPENAI_KEY
    },
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0'
  };
};

module.exports = {
  loadConfig,
  getSqlConfig,
  getClientConfig,
  getApiConfig
};
