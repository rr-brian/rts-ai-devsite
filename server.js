/**
 * Main server entry point
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

// Import modules
const { loadConfig } = require('./config');
const { configureCors } = require('./middleware/cors');
const { requestLogger, apiLogger } = require('./middleware/logging');
const apiRoutes = require('./routes/api');

// Load environment variables
loadConfig();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(configureCors());
app.use(requestLogger);

// API routes logging
app.use('/api', (req, res, next) => {
  console.log(`API request received: ${req.method} ${req.originalUrl}`);
  next();
});
app.use('/api', apiLogger);

// IMPORTANT: Direct handler for conversations/update endpoint must be registered BEFORE the API routes
app.post('/api/conversations/update', async (req, res) => {
  console.log('DIRECT HANDLER: /api/conversations/update endpoint called');
  
  // Direct implementation of the conversations update endpoint
  try {
    // Load UUID module for generating conversation IDs
    let uuidv4;
    try {
      uuidv4 = require('uuid').v4;
      console.log('UUID module loaded successfully');
    } catch (uuidError) {
      console.error('Failed to load UUID module:', uuidError);
      // Create a basic UUID generator if the module fails to load
      uuidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    try {
      // Try to load UUID module
      const uuid = require('uuid');
      uuidv4 = uuid.v4;
      console.log('UUID module loaded successfully');
    } catch (uuidError) {
      console.error('Failed to load UUID module:', uuidError);
      // Simple UUID fallback
      uuidv4 = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
    }
    
    // Azure Function configuration from environment variables
    const azureFunctionConfig = {
      endpoint: process.env.CONVERSATION_SAVE_FUNCTION_URL || '',
      key: process.env.CONVERSATION_SAVE_FUNCTION_KEY || ''
    };
    
    console.log('Azure Function config prepared:', { 
      endpointConfigured: azureFunctionConfig.endpoint ? 'Yes' : 'No'
    });
    
    const { 
      conversationId, 
      userId, 
      userEmail, 
      chatType, 
      messages, 
      totalTokens, 
      metadata 
    } = req.body;
    
    console.log('Request body received:', { conversationId, userId, userEmail, chatType });
    
    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages);
      return res.status(400).json({ error: 'Invalid messages format' });
    }
    
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';
      
    const lastAssistantMessage = messages
      .filter(m => m.role === 'assistant')
      .pop()?.content || '';
    
    // Prepare data for Azure Function
    const conversationData = {
      conversationId: conversationId || uuidv4(),
      userId: userId || 'anonymous',
      userEmail: userEmail || '',
      chatType: chatType || 'general',
      lastUpdated: new Date().toISOString(),
      startTime: new Date().toISOString(),
      messageCount: messages.length,
      totalTokens: totalTokens || 0,
      conversationState: messages,
      lastUserMessage,
      lastAssistantMessage,
      metadata: metadata || {}
    };
    
    // Call Azure Function to save conversation
    if (azureFunctionConfig.endpoint) {
      try {
        console.log(`Calling Azure Function to ${conversationId ? 'update' : 'create'} conversation`);
        
        const response = await fetch(azureFunctionConfig.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(azureFunctionConfig.key ? { 'x-functions-key': azureFunctionConfig.key } : {})
          },
          body: JSON.stringify(conversationData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Azure Function error:', response.status, errorText);
          throw new Error(`Azure Function returned ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Azure Function response:', result);
        
        if (conversationId) {
          console.log('Conversation updated successfully');
          res.status(200).json({ conversationId });
        } else {
          console.log('New conversation created successfully with ID:', conversationData.conversationId);
          res.status(201).json({ conversationId: conversationData.conversationId });
        }
      } catch (functionError) {
        console.error('Error calling Azure Function:', functionError);
        throw functionError;
      }
    } else {
      // No Azure Function configured, just return the conversation ID
      console.log('No Azure Function configured, skipping conversation save');
      
      if (conversationId) {
        res.status(200).json({ conversationId });
      } else {
        res.status(201).json({ conversationId: conversationData.conversationId });
      }
    }
  } catch (error) {
    console.error('Error updating conversation:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({ error: 'Failed to update conversation', details: error.message });
  } finally {
    // No cleanup needed for Azure Function calls
  }
}
});

// Mount API routes AFTER the direct handler
app.use('/api', apiRoutes);



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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Static files served from: ${path.join(__dirname, 'build')}`);
});
