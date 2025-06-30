# PowerShell script to copy local-preview build files to the build directory
# This ensures our manually created files are used instead of trying to build from React source

Write-Output "Copying local-preview build files to build directory..."

# Define source and target directories
$localPreviewBuildDir = "local-preview\build"
$targetBuildDir = "build"

# Create target directory if it doesn't exist
if (-not (Test-Path $targetBuildDir)) {
    New-Item -ItemType Directory -Path $targetBuildDir -Force
    Write-Output "Created target build directory: $targetBuildDir"
}

# Copy all files from local-preview/build to build
Copy-Item "$localPreviewBuildDir\*" -Destination "$targetBuildDir\" -Recurse -Force
Write-Output "Copied local-preview build files to build directory"

# List the files in the build directory
Write-Output "Files in build directory:"
Get-ChildItem "$targetBuildDir" | ForEach-Object { Write-Output "  - $($_.Name)" }

Write-Output "Local preview build files copied successfully!"
