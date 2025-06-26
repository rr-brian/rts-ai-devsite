/**
 * CORS middleware configuration
 */

// Try to load the cors module
let cors;
try {
  cors = require('cors');
  console.log('CORS module loaded successfully');
} catch (error) {
  console.warn('CORS module not available, will use Express fallback');
  // Create a simple CORS middleware fallback
  cors = function(options) {
    return function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    };
  };
}

// Configure CORS middleware
const configureCors = () => {
  return cors({
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://www.rrrealty.ai'] 
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  });
};

module.exports = {
  configureCors
};
