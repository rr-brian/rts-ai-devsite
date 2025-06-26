/**
 * Logging middleware for Express
 */

// General request logging middleware
const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log(`Request headers: ${JSON.stringify(req.headers)}`);
  console.log(`Request path: ${req.path}, originalUrl: ${req.originalUrl}`);
  next();
};

// API-specific logging middleware
const apiLogger = (req, res, next) => {
  console.log(`API Request: ${req.method} ${req.url}`);
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`API Response for ${req.method} ${req.url}: Status ${res.statusCode}`);
    if (typeof body === 'string' && body.length < 1000) {
      console.log(`Response body: ${body}`);
    } else {
      console.log('Response body too large to log');
    }
    return originalSend.call(this, body);
  };
  next();
};

module.exports = {
  requestLogger,
  apiLogger
};
