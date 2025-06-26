/**
 * Azure OpenAI API routes
 */
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// Azure OpenAI proxy endpoint
router.post('/chat', async (req, res) => {
  try {
    console.log('Azure OpenAI proxy endpoint called');
    
    const apiKey = process.env.REACT_APP_AZURE_OPENAI_API_KEY;
    const endpoint = process.env.REACT_APP_AZURE_OPENAI_ENDPOINT;
    const deploymentName = process.env.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.REACT_APP_AZURE_OPENAI_API_VERSION;
    
    if (!apiKey || !endpoint || !deploymentName || !apiVersion) {
      console.error('Missing Azure OpenAI configuration');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Azure OpenAI is not properly configured'
      });
    }
    
    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    console.log(`Sending request to Azure OpenAI at: ${url}`);
    console.log(`Request body: ${JSON.stringify(req.body)}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      console.error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return res.status(response.status).json({ 
        error: 'Azure OpenAI API error',
        status: response.status,
        message: errorText
      });
    }
    
    const data = await response.json();
    console.log('Azure OpenAI response received successfully');
    
    res.json(data);
  } catch (error) {
    console.error('Error in Azure OpenAI proxy:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Brokerage-specific OpenAI endpoint
router.post('/brokerage', async (req, res) => {
  try {
    console.log('Brokerage OpenAI endpoint called');
    
    const apiKey = process.env.REACT_APP_BROKERAGE_OPENAI_API_KEY;
    const endpoint = process.env.REACT_APP_BROKERAGE_OPENAI_ENDPOINT;
    const deploymentName = process.env.REACT_APP_BROKERAGE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.REACT_APP_BROKERAGE_OPENAI_API_VERSION;
    
    if (!apiKey || !endpoint || !deploymentName || !apiVersion) {
      console.error('Missing Brokerage OpenAI configuration');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Brokerage OpenAI is not properly configured'
      });
    }
    
    const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
    
    console.log(`Sending request to Brokerage OpenAI at: ${url}`);
    console.log(`Request body: ${JSON.stringify(req.body)}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      console.error(`Brokerage OpenAI API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return res.status(response.status).json({ 
        error: 'Brokerage OpenAI API error',
        status: response.status,
        message: errorText
      });
    }
    
    const data = await response.json();
    console.log('Brokerage OpenAI response received successfully');
    
    res.json(data);
  } catch (error) {
    console.error('Error in Brokerage OpenAI proxy:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
