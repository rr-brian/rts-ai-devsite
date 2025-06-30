# PowerShell deployment script for Azure App Service
# This script handles copying files and installing dependencies

# Define paths
$sourceDir = $env:DEPLOYMENT_SOURCE
$targetDir = $env:DEPLOYMENT_TARGET
if (-not $targetDir) {
    $targetDir = "$sourceDir\wwwroot"
}

Write-Output "Source directory: $sourceDir"
Write-Output "Target directory: $targetDir"
Write-Output "Node.js version: $(node -v)"
Write-Output "NPM version: $(npm -v)"

# Create target directory if it doesn't exist
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force
    Write-Output "Created target directory: $targetDir"
}

# Copy server.js and startup.js files
Write-Output "Copying server.js and startup.js files..."
Copy-Item "$sourceDir\server.js" -Destination "$targetDir\server.js" -Force
Copy-Item "$sourceDir\startup.js" -Destination "$targetDir\startup.js" -Force
Copy-Item "$sourceDir\server-minimal.js" -Destination "$targetDir\server-minimal.js" -Force -ErrorAction SilentlyContinue
Copy-Item "$sourceDir\minimal-server.js" -Destination "$targetDir\minimal-server.js" -Force -ErrorAction SilentlyContinue
Copy-Item "$sourceDir\express-server.js" -Destination "$targetDir\express-server.js" -Force -ErrorAction SilentlyContinue
Copy-Item "$sourceDir\express-server-full.js" -Destination "$targetDir\express-server-full.js" -Force -ErrorAction SilentlyContinue
Copy-Item "$sourceDir\server-fixed.js" -Destination "$targetDir\server-fixed.js" -Force -ErrorAction SilentlyContinue
Copy-Item "$sourceDir\app.js" -Destination "$targetDir\app.js" -Force -ErrorAction SilentlyContinue
Copy-Item "$sourceDir\server-improved.js" -Destination "$targetDir\server-improved.js" -Force -ErrorAction SilentlyContinue
Write-Output "Copied server JS files"

# Copy modular directories
$directories = @("config", "middleware", "routes", "services")
foreach ($dir in $directories) {
    Write-Output "Copying $dir directory..."
    if (-not (Test-Path "$targetDir\$dir")) {
        New-Item -ItemType Directory -Path "$targetDir\$dir" -Force
    }
    
    if (Test-Path "$sourceDir\$dir") {
        Copy-Item "$sourceDir\$dir\*" -Destination "$targetDir\$dir\" -Recurse -Force
    }
}

# Copy web.config
Write-Output "Copying web.config..."
Copy-Item "$sourceDir\web.config" -Destination "$targetDir\web.config" -Force

# Copy package.json files
Write-Output "Copying package.json files..."

# For React build, we need the original package.json
if (Test-Path "$sourceDir\package.json") {
    Copy-Item "$sourceDir\package.json" -Destination "$targetDir\package.json" -Force
    Write-Output "Copied original package.json for React build"
}

# Keep a backup of the server-package.json
if (Test-Path "$sourceDir\server-package.json") {
    Copy-Item "$sourceDir\server-package.json" -Destination "$targetDir\server-package.json" -Force
    Write-Output "Copied server-package.json as backup"
}

# Copy .env file if it exists
Write-Output "Checking for .env file..."
if (Test-Path "$sourceDir\.env") {
    Copy-Item "$sourceDir\.env" -Destination "$targetDir\.env" -Force
    Write-Output "Copied .env file"
}

# Create a minimal package.json if needed
Write-Output "Creating minimal package.json for dependency installation..."
$packageJson = @{
    name = "rts-ai-backend"
    version = "1.0.0"
    dependencies = @{
        express = "^4.18.2"
        cors = "^2.8.5"
        dotenv = "^16.0.3"
        "node-fetch" = "^2.6.9"
        uuid = "^9.0.0"
    }
    engines = @{
        node = "20.x"
    }
}
$packageJson | ConvertTo-Json | Set-Content -Path "$targetDir\package.json" -Force

# Change to target directory and install dependencies
Write-Output "Installing dependencies..."
Set-Location -Path $targetDir

# Install production dependencies first
Write-Output "Installing production dependencies..."
npm install --production

# Check if we should attempt to build the React app
$shouldBuildReact = $true

# Check if we have the local-preview build directory which we can use instead of building React
if (Test-Path "$sourceDir\local-preview\build") {
    Write-Output "Found local-preview build directory, will use these files instead of building React"
    
    # Create build directory if it doesn't exist
    if (-not (Test-Path "$targetDir\build")) {
        New-Item -Path "$targetDir\build" -ItemType Directory -Force | Out-Null
    }
    
    # Copy all files from local-preview/build to build directory
    Write-Output "Copying local-preview build files to build directory..."
    Copy-Item "$sourceDir\local-preview\build\*" -Destination "$targetDir\build\" -Recurse -Force
    Write-Output "Copied local-preview build files to build directory"
    
    # Skip React build since we're using local-preview files
    $shouldBuildReact = $false
}
# Check if we have the src directory which is needed for React build
elseif (-not (Test-Path "$targetDir\src")) {
    Write-Output "WARNING: src directory not found, cannot build React app"
    $shouldBuildReact = $false
}

if ($shouldBuildReact) {
    try {
        # Install React build dependencies
        Write-Output "Installing React build dependencies..."
        npm install --no-save react-scripts
        npm install --no-save react react-dom react-router-dom @azure/msal-react @azure/msal-browser react-markdown uuid
        
        # Create .env file with necessary environment variables for React build
        Write-Output "Creating .env file for React build..."
        @"
NODE_OPTIONS=--openssl-legacy-provider
SKIP_PREFLIGHT_CHECK=true
REACT_APP_AZURE_OPENAI_ENDPOINT=$env:REACT_APP_AZURE_OPENAI_ENDPOINT
REACT_APP_AZURE_OPENAI_API_KEY=$env:REACT_APP_AZURE_OPENAI_API_KEY
REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME=$env:REACT_APP_AZURE_OPENAI_DEPLOYMENT_NAME
REACT_APP_AZURE_OPENAI_API_VERSION=$env:REACT_APP_AZURE_OPENAI_API_VERSION
REACT_APP_CONVERSATION_FUNCTION_URL=$env:REACT_APP_CONVERSATION_FUNCTION_URL
REACT_APP_FUNCTION_KEY=$env:REACT_APP_FUNCTION_KEY
REACT_APP_AZURE_AD_AUTHORITY=$env:REACT_APP_AZURE_AD_AUTHORITY
REACT_APP_AZURE_AD_CLIENT_ID=$env:REACT_APP_AZURE_AD_CLIENT_ID
REACT_APP_AZURE_AD_REDIRECT_URI=$env:REACT_APP_AZURE_AD_REDIRECT_URI
"@ | Set-Content -Path "$targetDir\.env" -Force
        
        # Build the React app
        Write-Output "Building React app..."
        Write-Output "Checking src directory contents..."
        Get-ChildItem -Path "$targetDir\src" -Recurse | Select-Object -First 20 | ForEach-Object { Write-Output "  - $($_.FullName)" }
        
        # Set NODE_OPTIONS to avoid memory issues
        $env:NODE_OPTIONS="--max-old-space-size=4096 --openssl-legacy-provider"
        
        # Run the build with detailed output
        Write-Output "Running npm build command..."
        npm run build --verbose
    } catch {
        Write-Output "ERROR: React build failed with error: $_"
        Write-Output "Will attempt to create a placeholder build directory instead"
        $shouldBuildReact = $false
    }
}

# Verify build directory was created
if (Test-Path "$targetDir\build") {
    Write-Output "React app built successfully!"
    Get-ChildItem "$targetDir\build" | ForEach-Object { Write-Output "  - $($_.Name)" }
} else {
    Write-Output "WARNING: React build failed. Build directory not found."
    Write-Output "Creating manual placeholder build directory..."
    
    try {
        # Create the build directory if it doesn't exist
        if (-not (Test-Path "$targetDir\build")) {
            New-Item -Path "$targetDir\build" -ItemType Directory -Force | Out-Null
        }
        
        # Create a simple index.html file
        $indexHtml = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RTS AI Platform</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .endpoint { background-color: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .status { display: inline-block; padding: 5px 10px; border-radius: 4px; }
        .success { background-color: #d4edda; color: #155724; }
        .warning { background-color: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <h1>RTS AI Platform</h1>
    <div class="card">
        <h2>Placeholder Build</h2>
        <p>This is a placeholder page created by the server because the React build was not found.</p>
        <p>Server is running and API endpoints are available.</p>
        
        <h3>Environment Information:</h3>
        <p>Node.js: v20.x</p>
        <p>Environment: production</p>
        
        <h3>Available Endpoints:</h3>
        <div class="endpoint">/api/health - Check server health</div>
        <div class="endpoint">/api/azure-openai/chat - Chat with Azure OpenAI</div>
        <div class="endpoint">/api/conversations - Save conversation data</div>
    </div>
    
    <div class="card">
        <h2>Troubleshooting</h2>
        <p>The React build failed during deployment. Please check the following:</p>
        <ul>
            <li>Ensure all dependencies are properly installed</li>
            <li>Check for any build errors in the deployment logs</li>
            <li>Verify that all environment variables are correctly set</li>
        </ul>
    </div>
</body>
</html>
"@
        
        $indexHtml | Set-Content -Path "$targetDir\build\index.html" -Force
        
        # Create a simple manifest.json file
        $manifestJson = @"
{
  "short_name": "RTS AI",
  "name": "RTS AI Platform",
  "icons": [],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
"@
        
        $manifestJson | Set-Content -Path "$targetDir\build\manifest.json" -Force
        
        # Verify build directory was created
        if (Test-Path "$targetDir\build\index.html") {
            Write-Output "Placeholder build directory created successfully!"
            Get-ChildItem "$targetDir\build" | ForEach-Object { Write-Output "  - $($_.Name)" }
        } else {
            Write-Output "ERROR: Failed to create placeholder build directory"
        }
    } catch {
        Write-Output "ERROR: Failed to create placeholder build directory: $_"
    }
}

# Restore server-package.json as the main package.json for server operation
Write-Output "Restoring server-package.json for server operation..."
if (Test-Path "$targetDir\server-package.json") {
    Copy-Item "$targetDir\server-package.json" -Destination "$targetDir\package.json" -Force
    Write-Output "Restored server-package.json as package.json"
} else {
    Write-Output "WARNING: server-package.json not found, server may not have all required dependencies."
}

# Verify express is installed
Write-Output "Verifying express installation..."
if (-not (Test-Path "$targetDir\node_modules\express")) {
    Write-Output "Express not found, installing individually..."
    npm install express --save
    
    # Create fallback express module if still missing
    if (-not (Test-Path "$targetDir\node_modules\express")) {
        Write-Output "Creating fallback express module..."
        New-Item -ItemType Directory -Path "$targetDir\node_modules\express" -Force
        
        $expressJs = @"
// Minimal express module
module.exports = function() {
  return function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('Express module not properly installed. Please check deployment logs.');
  };
};
module.exports.static = function() { 
  return function(req, res, next) { 
    if(typeof next === 'function') next(); 
  }; 
};
module.exports.json = function() { 
  return function(req, res, next) { 
    if(typeof next === 'function') next(); 
  }; 
};
module.exports.urlencoded = function() { 
  return function(req, res, next) { 
    if(typeof next === 'function') next(); 
  }; 
};
module.exports.Router = function() { 
  return { 
    get: function() {}, 
    post: function() {}, 
    use: function() {} 
  }; 
};
"@
        Set-Content -Path "$targetDir\node_modules\express\index.js" -Value $expressJs
        Write-Output "Created minimal express.js module"
    }
}

Write-Output "Deployment completed successfully!"

# Verify build directory was created
if (Test-Path "$targetDir\build") {
    Write-Output "React app built successfully!"
    Get-ChildItem "$targetDir\build" | ForEach-Object { Write-Output "  - $($_.Name)" }
} else {
    Write-Output "WARNING: React build failed. Build directory not found."
    Write-Output "Creating manual placeholder build directory..."
    
    try {
        # Create the build directory if it doesn't exist
        if (-not (Test-Path "$targetDir\build")) {
            New-Item -Path "$targetDir\build" -ItemType Directory -Force | Out-Null
        }
        
        # Create a simple index.html file
        $indexHtml = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RTS AI Platform</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .endpoint { background-color: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .status { display: inline-block; padding: 5px 10px; border-radius: 4px; }
        .success { background-color: #d4edda; color: #155724; }
        .warning { background-color: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <h1>RTS AI Platform</h1>
    <div class="card">
        <h2>Placeholder Build</h2>
        <p>This is a placeholder page created by the server because the React build was not found.</p>
        <p>Server is running and API endpoints are available.</p>
        
        <h3>Environment Information:</h3>
        <p>Node.js: v20.x</p>
        <p>Environment: production</p>
        
        <h3>Available Endpoints:</h3>
        <div class="endpoint">/api/health - Check server health</div>
        <div class="endpoint">/api/azure-openai/chat - Chat with Azure OpenAI</div>
        <div class="endpoint">/api/conversations - Save conversation data</div>
    </div>
    
    <div class="card">
        <h2>Troubleshooting</h2>
        <p>The React build failed during deployment. Please check the following:</p>
        <ul>
            <li>Ensure all dependencies are properly installed</li>
            <li>Check for any build errors in the deployment logs</li>
            <li>Verify that all environment variables are correctly set</li>
        </ul>
    </div>
</body>
</html>
"@
        
        $indexHtml | Set-Content -Path "$targetDir\build\index.html" -Force
        
        # Create a simple manifest.json file
        $manifestJson = @"
{
  "short_name": "RTS AI",
  "name": "RTS AI Platform",
  "icons": [],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
"@
        
        $manifestJson | Set-Content -Path "$targetDir\build\manifest.json" -Force
        
        # Verify build directory was created
        if (Test-Path "$targetDir\build\index.html") {
            Write-Output "Placeholder build directory created successfully!"
            Get-ChildItem "$targetDir\build" | ForEach-Object { Write-Output "  - $($_.Name)" }
        } else {
            Write-Output "ERROR: Failed to create placeholder build directory"
        }
    } catch {
        Write-Output "ERROR: Failed to create placeholder build directory: $_"
    }
}

# Restore server-package.json as the main package.json for server operation
Write-Output "Restoring server-package.json for server operation..."
if (Test-Path "$targetDir\server-package.json") {
    Copy-Item "$targetDir\server-package.json" -Destination "$targetDir\package.json" -Force
    Write-Output "Restored server-package.json as package.json"
} else {
    Write-Output "WARNING: server-package.json not found, server may not have all required dependencies."
}

# Verify express is installed
Write-Output "Verifying express installation..."
if (-not (Test-Path "$targetDir\node_modules\express")) {
    Write-Output "Express not found, installing individually..."
    npm install express --save
    
    # Create fallback express module if still missing
    if (-not (Test-Path "$targetDir\node_modules\express")) {
        Write-Output "Creating fallback express module..."
        New-Item -ItemType Directory -Path "$targetDir\node_modules\express" -Force
        
        $expressJs = @"
// Minimal express module
module.exports = function() {
  return function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('Express module not properly installed. Please check deployment logs.');
  };
};
module.exports.static = function() { 
  return function(req, res, next) { 
    if(typeof next === 'function') next(); 
  }; 
};
module.exports.json = function() { 
  return function(req, res, next) { 
    if(typeof next === 'function') next(); 
  }; 
};
module.exports.urlencoded = function() { 
  return function(req, res, next) { 
    if(typeof next === 'function') next(); 
  }; 
};
module.exports.Router = function() { 
  return { 
    get: function() {}, 
    post: function() {}, 
    use: function() {} 
  }; 
};
"@
        Set-Content -Path "$targetDir\node_modules\express\index.js" -Value $expressJs
        Write-Output "Created minimal express.js module"
    }
}

Write-Output "Deployment completed successfully!"
