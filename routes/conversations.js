/**
 * Routes for conversation management
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { saveConversation } = require('../services/conversations');

const router = express.Router();

/**
 * POST /api/conversations
 * Save or update a conversation
 */
router.post('/', async (req, res) => {
  try {
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
      lastUserMessage,
      lastAssistantMessage,
      messages,
      totalTokens: totalTokens || 0,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };
    
    const result = await saveConversation(conversationData);
    
    if (conversationId) {
      console.log('Conversation updated successfully');
      res.status(200).json({ conversationId: conversationData.conversationId });
    } else {
      console.log('New conversation created with ID:', conversationData.conversationId);
      res.status(201).json({ conversationId: conversationData.conversationId });
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({ error: 'Failed to update conversation', details: error.message });
  }
});

module.exports = router;
