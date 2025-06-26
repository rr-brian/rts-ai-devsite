# Deployment Information

## Latest Deployment
- Date: June 25, 2025
- Version: 1.0.1
- Changes: 
  - Added temporary direct handler for `/api/conversations/update` endpoint
  - Fixed 404 errors for conversation saving in production

## Deployment Process
1. Push changes to GitHub repository
2. Azure App Service automatically deploys from the GitHub repository
3. Verify that all endpoints are working correctly in production

## Important Files
- `server.js` - Main server file
- `deploy.cmd` - Azure deployment script
- `web.config` - IIS configuration file
