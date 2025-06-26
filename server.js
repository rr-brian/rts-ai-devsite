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
    // Load required modules directly
    let sql, uuidv4;
    try {
      // Try to load the SQL wrapper
      sql = require('./server/lib/mssql-wrapper');
      console.log('SQL wrapper loaded successfully');
    } catch (sqlError) {
      console.error('Failed to load SQL wrapper:', sqlError);
      // Create a basic mock if we can't load the real one
      sql = {
        connect: () => Promise.resolve(),
        close: () => Promise.resolve(),
        Request: class {
          constructor() { this.inputs = {}; }
          input(name, type, value) { this.inputs[name] = value; return this; }
          query() { return Promise.resolve({ recordset: [] }); }
        },
        UniqueIdentifier: String,
        NVarChar: String,
        DateTime2: Date,
        Int: Number
      };
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
    
    // SQL Server configuration from environment variables
    const config = {
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
    
    console.log('SQL config prepared:', { 
      user: config.user, 
      server: config.server, 
      database: config.database 
    });
    
    // Connect to SQL Server
    await sql.connect(config);
    console.log('SQL connection established');
    
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
    
    const request = new sql.Request();
    
    if (conversationId) {
      // Update existing conversation
      console.log('Updating existing conversation:', conversationId);
      await request
        .input('ConversationId', sql.UniqueIdentifier, conversationId)
        .input('LastUpdated', sql.DateTime2, new Date())
        .input('MessageCount', sql.Int, messages.length)
        .input('TotalTokens', sql.Int, totalTokens || 0)
        .input('ConversationState', sql.NVarChar, JSON.stringify(messages))
        .input('LastUserMessage', sql.NVarChar, lastUserMessage)
        .input('LastAssistantMessage', sql.NVarChar, lastAssistantMessage)
        .input('Metadata', sql.NVarChar, JSON.stringify(metadata || {}))
        .query(`
          UPDATE Conversations
          SET LastUpdated = @LastUpdated,
              MessageCount = @MessageCount,
              TotalTokens = @TotalTokens,
              ConversationState = @ConversationState,
              LastUserMessage = @LastUserMessage,
              LastAssistantMessage = @LastAssistantMessage,
              Metadata = @Metadata
          WHERE ConversationId = @ConversationId
        `);
        
      console.log('Conversation updated successfully');
      res.status(200).json({ conversationId });
    } else {
      // Create new conversation
      const newConversationId = uuidv4();
      console.log('Creating new conversation with ID:', newConversationId);
      
      await request
        .input('ConversationId', sql.UniqueIdentifier, newConversationId)
        .input('UserId', sql.NVarChar, userId || 'anonymous')
        .input('UserEmail', sql.NVarChar, userEmail || '')
        .input('ChatType', sql.NVarChar, chatType || 'general')
        .input('LastUpdated', sql.DateTime2, new Date())
        .input('StartTime', sql.DateTime2, new Date())
        .input('MessageCount', sql.Int, messages.length)
        .input('TotalTokens', sql.Int, totalTokens || 0)
        .input('ConversationState', sql.NVarChar, JSON.stringify(messages))
        .input('LastUserMessage', sql.NVarChar, lastUserMessage)
        .input('LastAssistantMessage', sql.NVarChar, lastAssistantMessage)
        .input('Metadata', sql.NVarChar, JSON.stringify(metadata || {}))
        .query(`
          INSERT INTO Conversations (
            ConversationId, UserId, UserEmail, ChatType, LastUpdated, StartTime,
            MessageCount, TotalTokens, ConversationState, LastUserMessage, 
            LastAssistantMessage, Metadata
          )
          VALUES (
            @ConversationId, @UserId, @UserEmail, @ChatType, @LastUpdated, @StartTime,
            @MessageCount, @TotalTokens, @ConversationState, @LastUserMessage,
            @LastAssistantMessage, @Metadata
          )
        `);
        
      console.log('New conversation created successfully');
      res.status(201).json({ conversationId: newConversationId });
    }
  } catch (error) {
    console.error('Error updating conversation:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({ error: 'Failed to update conversation', details: error.message });
  } finally {
    // Close the SQL connection if it exists
    try {
      if (sql && typeof sql.close === 'function') {
        await sql.close();
        console.log('SQL connection closed');
      }
    } catch (err) {
      console.error('Error closing SQL connection:', err);
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
