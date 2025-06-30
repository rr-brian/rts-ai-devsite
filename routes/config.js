const express = require('express');
const router = express.Router();

// Endpoint to provide frontend configuration without exposing sensitive keys
router.get('/frontend-config', (req, res) => {
  // Only provide the minimum necessary configuration
  // No API keys are exposed here
  const frontendConfig = {
    azureOpenAI: {
      endpoint: process.env.REACT_APP_AZURE_OPENAI_ENDPOINT || '',
      deploymentName: process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME || '',
      apiVersion: process.env.REACT_APP_AZURE_OPENAI_API_VERSION || ''
    },
    apiUrl: process.env.REACT_APP_API_URL || ''
  };
  
  res.json(frontendConfig);
});

module.exports = router;
