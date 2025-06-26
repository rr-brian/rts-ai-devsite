/**
 * Conversation service for saving and retrieving conversations
 * Uses Azure Functions for persistence
 */
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

/**
 * Get Azure Function configuration from environment variables
 * @returns {Object} Configuration object with endpoint and key
 */
function getAzureFunctionConfig() {
  return {
    endpoint: process.env.FN_CONVERSATIONSAVE_URL || process.env.CONVERSATION_SAVE_FUNCTION_URL || '',
    key: process.env.FN_CONVERSATIONSAVE_KEY || process.env.CONVERSATION_SAVE_FUNCTION_KEY || ''
  };
}

/**
 * Save or update a conversation using Azure Function
 * @param {Object} conversationData - Conversation data to save
 * @returns {Promise<Object>} - Promise resolving to the saved conversation
 */
async function saveConversation(conversationData) {
  const azureFunctionConfig = getAzureFunctionConfig();
  
  console.log('fn-conversationsave Function config prepared:', { 
    endpointConfigured: azureFunctionConfig.endpoint ? 'Yes' : 'No',
    source: process.env.FN_CONVERSATIONSAVE_URL ? 'FN_CONVERSATIONSAVE_URL' : 
            (process.env.CONVERSATION_SAVE_FUNCTION_URL ? 'CONVERSATION_SAVE_FUNCTION_URL' : 'Not configured')
  });

  // Ensure conversationId exists
  if (!conversationData.conversationId) {
    conversationData.conversationId = uuidv4();
  }

  // Call Azure Function to save conversation
  if (azureFunctionConfig.endpoint) {
    try {
      console.log(`Calling fn-conversationsave Function to ${conversationData.conversationId ? 'update' : 'create'} conversation`);
      
      const response = await fetch(azureFunctionConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionConfig.key && { 'x-functions-key': azureFunctionConfig.key })
        },
        body: JSON.stringify(conversationData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('fn-conversationsave Function error:', response.status, errorText);
        throw new Error(`fn-conversationsave Function returned ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('fn-conversationsave Function response:', result);
      
      return result;
    } catch (functionError) {
      console.error('Error calling fn-conversationsave Function:', functionError);
      throw functionError;
    }
  } else {
    // No fn-conversationsave Function configured, just return the conversation ID
    console.log('No fn-conversationsave Function configured, skipping conversation save');
    return { conversationId: conversationData.conversationId };
  }
}

module.exports = {
  saveConversation,
  getAzureFunctionConfig
};
