// Express server with minimal functionality
const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Express server is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Express Server</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #0066cc; }
          .container { max-width: 800px; margin: 0 auto; }
          .status { padding: 20px; background-color: #e6f7ff; border-left: 5px solid #0066cc; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Express Server</h1>
          <div class="status">
            <p><strong>Status:</strong> Running</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
            <p><strong>Server Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>The server is working correctly with Express.</p>
          <p>Try the <a href="/api/health">/api/health</a> endpoint to see JSON response.</p>
        </div>
      </body>
    </html>
  `);
});

// Catch-all for 404s
app.use((req, res) => {
  res.status(404).send('Not found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Server error');
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});
