# PowerShell script to clean build directory of sensitive information
# This script removes any files containing sensitive information from the build directory

Write-Output "Cleaning build directory of sensitive information..."

# Define paths
$buildDir = ".\build"
$staticJsDir = "$buildDir\static\js"

# Check if build directory exists
if (-not (Test-Path $buildDir)) {
    Write-Output "Build directory not found. Nothing to clean."
    exit 0
}

# Remove any JavaScript files in the static/js directory that might contain sensitive information
if (Test-Path $staticJsDir) {
    Write-Output "Removing JavaScript files from $staticJsDir..."
    Remove-Item "$staticJsDir\*.js" -Force
    Remove-Item "$staticJsDir\*.js.map" -Force
    Write-Output "JavaScript files removed from $staticJsDir"
}

# Create a clean version of the JavaScript files
Write-Output "Creating clean versions of JavaScript files..."

# Create the chat.js file without sensitive information
$chatJs = @"
// Chat interface JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const clearButton = document.getElementById('clear-button');
    const saveButton = document.getElementById('save-button');
    let messageList = [];
    let isLoading = false;

    // Function to set loading state
    function setIsLoading(loading) {
        isLoading = loading;
        if (loading) {
            showLoadingIndicator();
        } else {
            hideLoadingIndicator();
        }
    }

    // Function to show loading indicator
    function showLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant-message typing';
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
    
    // Function to load configuration from the server
    let configPromise = null;
    async function getConfig() {
        if (!configPromise) {
            configPromise = fetch('/api/frontend-config')
                .then(response => response.json())
                .catch(error => {
                    console.error('Error loading configuration:', error);
                    return {};
                });
        }
        return configPromise;
    }
    
    // Function to send a message to Azure OpenAI API via backend proxy
    async function sendMessageToAzureOpenAI(messages) {
        setIsLoading(true);
        try {
            // Ensure we have config loaded
            await getConfig();
            
            const response = await fetch('/api/azure-openai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages })
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
            
            // Save only to fn-conversationsave endpoint
            await fetch('/api/fn-conversationsave', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            console.log('Conversation saved successfully to /api/fn-conversationsave');
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
    
    // Function to add a message to the chat UI
    function addMessageToChat(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        // Convert markdown to HTML
        const converter = new showdown.Converter();
        const html = converter.makeHtml(content);
        messageDiv.innerHTML = html;
        
        // Add syntax highlighting to code blocks
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Function to clear chat
    function clearChat() {
        chatMessages.innerHTML = '';
        messageList = [];
    }
    
    // Event listener for chat form submission
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userMessage = userInput.value.trim();
        if (!userMessage || isLoading) return;
        
        // Add user message to UI
        addMessageToChat('user', userMessage);
        
        // Add user message to message list
        messageList.push({
            role: 'user',
            content: userMessage
        });
        
        // Clear input
        userInput.value = '';
        
        // Get response from Azure OpenAI
        const assistantMessage = await sendMessageToAzureOpenAI(messageList);
        
        // Add assistant message to UI
        addMessageToChat('assistant', assistantMessage.content);
        
        // Add assistant message to message list
        messageList.push(assistantMessage);
        
        // Hide loading indicator
        setIsLoading(false);
    });
    
    // Event listener for clear button
    clearButton.addEventListener('click', clearChat);
    
    // Event listener for save button
    saveButton.addEventListener('click', function() {
        if (messageList.length > 0) {
            saveConversation(messageList);
        }
    });
});
"@

# Ensure the static/js directory exists
if (-not (Test-Path $staticJsDir)) {
    New-Item -Path $staticJsDir -ItemType Directory -Force | Out-Null
}

# Write the clean chat.js file
Set-Content -Path "$staticJsDir\chat.js" -Value $chatJs -Force
Write-Output "Created clean version of chat.js in $staticJsDir"

Write-Output "Build directory cleaned of sensitive information"
