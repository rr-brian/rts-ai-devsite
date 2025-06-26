# RTS AI - Modern Chatbot Interface

A modern, responsive React-based web application with a chatbot UI that connects to Azure OpenAI. This project is designed to be easily deployable to GitHub and Azure.

## Project Overview

This application provides a clean, modern interface for interacting with an AI chatbot powered by Azure OpenAI. The current implementation includes a placeholder UI with mock responses, which will be connected to the actual Azure OpenAI service in future iterations.

## Azure Configuration

- Azure Region: `rg-innovation`
- Web App Name: `rts-win-innovate`
- Subscription: `rts-ai`
- Subscription ID: `42ac2a48-c157-4b23-a6d1-41dd757723c9`

## Project Structure

```
/
├── public/               # Static files
├── src/
│   ├── services/         # API services
│   │   └── azureOpenAI.js # Azure OpenAI integration
│   ├── App.js            # Main application component
│   ├── App.css           # Application styles
│   └── index.js          # Entry point
└── package.json          # Project dependencies
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Local Development

1. Clone the repository:
   ```
   git clone https://github.com/rr-brian/rts-ai.git
   cd rts-ai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

## Deployment

### GitHub

The project is configured to be deployed from GitHub. The repository is located at:
```
https://github.com/rr-brian/rts-ai.git
```

### Azure Deployment

To deploy this application to Azure:

1. Create an Azure Web App
2. Configure the deployment source to use the GitHub repository
3. Set up the necessary environment variables for Azure OpenAI integration:
   - `REACT_APP_AZURE_OPENAI_ENDPOINT`
   - `REACT_APP_AZURE_OPENAI_API_KEY`
   - `REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME`
   - `REACT_APP_AZURE_OPENAI_API_VERSION`

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App configuration

## Future Enhancements

- Integration with Azure OpenAI API
- Enhanced chat features (message history, typing indicators)
- User authentication
- Customizable themes
