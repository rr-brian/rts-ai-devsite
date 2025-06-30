# PowerShell deployment script for Azure App Service
# This script handles deploying the chat interface to Azure without exposing sensitive information

# Define paths
$sourceDir = $env:DEPLOYMENT_SOURCE
if (-not $sourceDir) {
    $sourceDir = $PWD.Path
}
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

# Create build directory if it doesn't exist
if (-not (Test-Path "$targetDir\build")) {
    New-Item -Path "$targetDir\build" -ItemType Directory -Force | Out-Null
    Write-Output "Created build directory: $targetDir\build"
}

# Copy server.js and related files
Write-Output "Copying server JS files..."
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

# Copy .env file if it exists (but don't commit it to git)
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

# Check if we have the local-preview build directory
if (Test-Path "$sourceDir\local-preview\build") {
    Write-Output "Found local-preview build directory, will use these files"
    
    # Copy all files from local-preview/build to build directory
    Write-Output "Copying local-preview build files to build directory..."
    Copy-Item "$sourceDir\local-preview\build\*" -Destination "$targetDir\build\" -Recurse -Force
    Write-Output "Copied local-preview build files to build directory"
} else {
    Write-Output "WARNING: local-preview build directory not found"
    
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
        <p>This is a placeholder page created by the server because the build files were not found.</p>
        <p>Server is running and API endpoints are available.</p>
        
        <h3>Environment Information:</h3>
        <p>Node.js: v20.x</p>
        <p>Environment: production</p>
        
        <h3>Available Endpoints:</h3>
        <div class="endpoint">/api/health - Check server health</div>
        <div class="endpoint">/api/azure-openai/chat - Chat with Azure OpenAI</div>
        <div class="endpoint">/api/fn-conversationsave - Save conversation data</div>
    </div>
</body>
</html>
"@
    Set-Content -Path "$targetDir\build\index.html" -Value $indexHtml -Force
    Write-Output "Created placeholder index.html"
}

# Change to target directory and install dependencies
Write-Output "Installing dependencies..."
Set-Location -Path $targetDir

# Install production dependencies
Write-Output "Installing production dependencies..."
npm install --production

Write-Output "Deployment completed successfully!"
