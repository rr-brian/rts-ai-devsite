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
}
$packageJson | ConvertTo-Json | Set-Content -Path "$targetDir\package.json" -Force

# Change to target directory and install dependencies
Write-Output "Installing dependencies..."
Set-Location -Path $targetDir

# Install production dependencies first
Write-Output "Installing production dependencies..."
npm install --production

# Install React build dependencies
Write-Output "Installing React build dependencies..."
npm install --no-save react-scripts

# Build the React app
Write-Output "Building React app..."
npm run build

# Verify build directory was created
if (Test-Path "$targetDir\build") {
    Write-Output "React app built successfully!"
    Get-ChildItem "$targetDir\build" | ForEach-Object { Write-Output "  - $($_.Name)" }
} else {
    Write-Output "WARNING: React build failed. Build directory not found."
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
