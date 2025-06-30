document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const chatMessages = document.getElementById('chatMessages');
    let isLoading = false;
    
    // Initialize with a debug message to check server configuration
    addMessageToUI('assistant', "Initializing chat interface and checking server configuration...");
    
    // System message for context
    const systemMessage = {
        role: 'system',
        content: 'You are an AI assistant for RTS AI Platform, helping users understand our enterprise AI solutions and services.'
    };
    
    // Initialize messages array with system message and greeting
    const messages = [
        systemMessage,
        { role: 'assistant', content: "Hello! I'm your RTS AI assistant. How can I help you today?" }
    ];
    
    // Function to check server configuration
    async function checkServerConfig() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            console.log('Server health check:', data);
            
            // Get environment variables for debugging
            const envResponse = await fetch('/api/env');
            const envData = await envResponse.json();
            console.log('Environment variables:', envData);
            
            // Extract Azure OpenAI configuration
            const azureConfig = ({
                endpoint: envData?.environment?.REACT_APP_AZURE_OPENAI_ENDPOINT || 'Not configured',
                deploymentName: envData?.environment?.REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME || 'Not configured',
                apiVersion: envData?.environment?.REACT_APP_AZURE_OPENAI_API_VERSION || 'Not configured',
                apiKeyAvailable: envData?.environment?.REACT_APP_AZURE_OPENAI_API_KEY ? 'Yes (redacted)' : 'No'
            });
            
            // Update UI with configuration status
            const configStatus = `Server is running. Azure OpenAI configuration: ` + 
                `Endpoint: ${azureConfig.endpoint}, ` +
                `Deployment: ${azureConfig.deploymentName}, ` +
                `API Version: ${azureConfig.apiVersion}, ` +
                `API Key Available: ${azureConfig.apiKeyAvailable}`;
            
            addMessageToUI('assistant', configStatus);
            addMessageToUI('assistant', "I'm ready to chat now. How can I help you today?");
            
            return azureConfig;
        } catch (error) {
            console.error('Error checking server configuration:', error);
            addMessageToUI('assistant', "There was an error checking the server configuration. The chat may not work correctly.");
            return {
                endpoint: 'https://generalsearchai.openai.azure.com/',
                deploymentName: 'gpt-4.1',
                apiVersion: '2025-01-01-preview'
            };
        }
    }
    
    // Function to add a message to the chat UI
    function addMessageToUI(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(role === 'user' ? 'user-message' : 'assistant-message');
        
        // Process markdown in assistant messages
        if (role === 'assistant') {
            // Simple markdown processing
            let processedContent = content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
                .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // Code blocks
                .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline code
                .replace(/#{3}\s*(.*)/g, '<h3>$1</h3>') // H3
                .replace(/#{2}\s*(.*)/g, '<h2>$1</h2>') // H2
                .replace(/#{1}\s*(.*)/g, '<h1>$1</h1>'); // H1
            
            // Handle line breaks
            processedContent = processedContent.replace(/\n/g, '<br>');
            
            messageDiv.innerHTML = processedContent;
        } else {
            messageDiv.textContent = content;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Function to show loading indicator
    function showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('typing-indicator');
        loadingDiv.id = 'typingIndicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            loadingDiv.appendChild(dot);
        }
        
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Function to hide loading indicator
    function hideLoadingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    // Function to send message to API
    async function sendMessageToAPI(messageList) {
        try {
            const response = await fetch('/api/azure-openai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messageList
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API returned ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('API response:', data);
            
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message;
            } else {
                throw new Error('No response choices returned from Azure OpenAI');
            }
        } catch (error) {
            console.error('Error sending message to API:', error);
            return {
                role: 'assistant',
                content: `I'm sorry, there was an error communicating with the Azure OpenAI service: ${error.message}. Please check the server logs for more details.`
            };
        }
    }
    
    // Function to save conversation to the server
    async function saveConversation(messageList) {
        try {
            const conversationId = generateUUID();
            const timestamp = new Date().toISOString();
            const payload = {
                conversation_id: conversationId,
                messages: messageList,
                timestamp: timestamp
            };
            
            // Save to /api/conversations endpoint
            await fetch('/api/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            // Also save to fn-conversationsave endpoint
            await fetch('/api/fn-conversationsave', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Conversation saved successfully to both endpoints');
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }
    
    // Generate a UUID for conversation tracking
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userMessage = userInput.value.trim();
        if (!userMessage || isLoading) return;
        
        // Clear input
        userInput.value = '';
        
        // Add user message to UI and messages array
        addMessageToUI('user', userMessage);
        messages.push({ role: 'user', content: userMessage });
        
        // Show loading indicator and disable input
        isLoading = true;
        userInput.disabled = true;
        sendButton.disabled = true;
        showLoadingIndicator();
        
        try {
            // Send message to API
            const response = await sendMessageToAPI(messages);
            
            // Hide loading indicator
            hideLoadingIndicator();
            
            // Add assistant response to UI and messages array
            addMessageToUI('assistant', response.content);
            messages.push(response);
            
            // Save conversation to the server
            saveConversation(messages);
        } catch (error) {
            console.error('Error in chat process:', error);
            hideLoadingIndicator();
            addMessageToUI('assistant', "I'm sorry, there was an error processing your request. Please try again.");
        } finally {
            // Re-enable input
            isLoading = false;
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    });
    
    // Check server configuration on load
    checkServerConfig();
});
