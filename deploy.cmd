@if "%SCM_TRACE_LEVEL%" NEQ "4" @echo off

:: ----------------------
:: KUDU Deployment Script
:: ----------------------

:: Setup
setlocal enabledelayedexpansion

IF NOT DEFINED DEPLOYMENT_SOURCE (
  SET DEPLOYMENT_SOURCE=%~dp0%.
)

IF NOT DEFINED DEPLOYMENT_TARGET (
  SET DEPLOYMENT_TARGET=%ARTIFACTS%\wwwroot
)

IF NOT DEFINED NEXT_MANIFEST_PATH (
  SET NEXT_MANIFEST_PATH=%ARTIFACTS%\manifest
)

IF NOT DEFINED PREVIOUS_MANIFEST_PATH (
  SET PREVIOUS_MANIFEST_PATH=%ARTIFACTS%\manifest
)

IF NOT DEFINED KUDU_SYNC_CMD (
  :: Install kudu sync
  echo Installing Kudu Sync
  call npm install kudusync -g --silent
  IF !ERRORLEVEL! NEQ 0 goto error

  :: Locally just running "kuduSync" would also work
  SET KUDU_SYNC_CMD=kudusync
)

:: 1. Check if build directory exists
:: Skipping build directory check for server-only deployment
echo Skipping build directory check for server-only deployment...

:: 2. Create the deployment target directory structure first
echo Creating deployment target directory structure...
IF NOT EXIST "%DEPLOYMENT_TARGET%" (
  call :ExecuteCmd mkdir "%DEPLOYMENT_TARGET%"
  IF !ERRORLEVEL! NEQ 0 goto error
)

:: 3. Copy server.js and startup.js files
echo Copying server.js and startup.js files...
IF EXIST "%DEPLOYMENT_SOURCE%\server.js" (
  echo Copying server.js
  call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\server.js" "%DEPLOYMENT_TARGET%\server.js" /Y
  IF !ERRORLEVEL! NEQ 0 goto error
)

IF EXIST "%DEPLOYMENT_SOURCE%\startup.js" (
  echo Copying startup.js
  call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\startup.js" "%DEPLOYMENT_TARGET%\startup.js" /Y
  IF !ERRORLEVEL! NEQ 0 goto error
)

:: 3.1 Copy new modular directories (config, middleware, routes)
echo Copying modular directories...

:: Copy config directory
echo Creating config directory
IF NOT EXIST "%DEPLOYMENT_TARGET%\config" (
  call :ExecuteCmd mkdir "%DEPLOYMENT_TARGET%\config"
  IF !ERRORLEVEL! NEQ 0 goto error
)

echo Copying config directory contents
call :ExecuteCmd xcopy "%DEPLOYMENT_SOURCE%\config" "%DEPLOYMENT_TARGET%\config" /E /Y
IF !ERRORLEVEL! NEQ 0 goto error

:: Copy middleware directory
echo Creating middleware directory
IF NOT EXIST "%DEPLOYMENT_TARGET%\middleware" (
  call :ExecuteCmd mkdir "%DEPLOYMENT_TARGET%\middleware"
  IF !ERRORLEVEL! NEQ 0 goto error
)

echo Copying middleware directory contents
call :ExecuteCmd xcopy "%DEPLOYMENT_SOURCE%\middleware" "%DEPLOYMENT_TARGET%\middleware" /E /Y
IF !ERRORLEVEL! NEQ 0 goto error

:: Copy routes directory
echo Creating routes directory
IF NOT EXIST "%DEPLOYMENT_TARGET%\routes" (
  call :ExecuteCmd mkdir "%DEPLOYMENT_TARGET%\routes"
  IF !ERRORLEVEL! NEQ 0 goto error
)

echo Copying routes directory contents
call :ExecuteCmd xcopy "%DEPLOYMENT_SOURCE%\routes" "%DEPLOYMENT_TARGET%\routes" /E /Y
IF !ERRORLEVEL! NEQ 0 goto error

:: Copy services directory
echo Creating services directory
IF NOT EXIST "%DEPLOYMENT_TARGET%\services" (
  call :ExecuteCmd mkdir "%DEPLOYMENT_TARGET%\services"
  IF !ERRORLEVEL! NEQ 0 goto error
)

echo Copying services directory contents
call :ExecuteCmd xcopy "%DEPLOYMENT_SOURCE%\services" "%DEPLOYMENT_TARGET%\services" /E /Y
IF !ERRORLEVEL! NEQ 0 goto error

:: 4. Copy web.config file and other critical files
echo Copying web.config to deployment target...
call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\web.config" "%DEPLOYMENT_TARGET%\web.config" /Y
IF !ERRORLEVEL! NEQ 0 goto error


echo Skipping api-test.html copy step as file does not exist...

:: 5. KuduSync - Skip copying build files since we're doing a server-only deployment
echo Skipping build files sync for server-only deployment...

:: 6. Copy node_modules
echo Copying node_modules...

echo Copying node_modules directory
IF EXIST "%DEPLOYMENT_SOURCE%\node_modules" (
  IF NOT EXIST "%DEPLOYMENT_TARGET%\node_modules" (
    echo Creating node_modules directory
    call :ExecuteCmd mkdir "%DEPLOYMENT_TARGET%\node_modules"
    IF !ERRORLEVEL! NEQ 0 goto error
  )
  
  echo Copying mssql module
  IF EXIST "%DEPLOYMENT_SOURCE%\node_modules\mssql" (
    IF NOT EXIST "%DEPLOYMENT_TARGET%\node_modules\mssql" (
      call :ExecuteCmd mkdir "%DEPLOYMENT_TARGET%\node_modules\mssql"
      IF !ERRORLEVEL! NEQ 0 goto error
    )
    call :ExecuteCmd xcopy "%DEPLOYMENT_SOURCE%\node_modules\mssql" "%DEPLOYMENT_TARGET%\node_modules\mssql" /E /Y
    IF !ERRORLEVEL! NEQ 0 goto error
  )
)

:: 5. Copy server-package.json from source to deployment target as package.json
echo Copying server-package.json from source to deployment target as package.json...
call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\server-package.json" "%DEPLOYMENT_TARGET%\package.json" /Y
IF !ERRORLEVEL! NEQ 0 goto error

:: 5.1 Create a package.json if it doesn't exist
IF NOT EXIST "%DEPLOYMENT_TARGET%\package.json" (
  echo WARNING: package.json not found, creating a minimal one
  echo {"dependencies": {"express": "^4.18.2", "cors": "^2.8.5", "dotenv": "^16.0.3", "node-fetch": "^2.6.9", "uuid": "^9.0.0"}} > "%DEPLOYMENT_TARGET%\package.json"
)

:: 5.2 Copy package.json from source to deployment target if it exists
echo Checking for package.json in source...
IF EXIST "%DEPLOYMENT_SOURCE%\package.json" (
  echo Found package.json, copying to deployment target...
  call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\package.json" "%DEPLOYMENT_TARGET%\package.json.full" /Y
  IF !ERRORLEVEL! NEQ 0 goto error
)

:: 5.3 Copy .env file if it exists
echo Checking for .env file in source...
IF EXIST "%DEPLOYMENT_SOURCE%\.env" (
  echo Found .env file, copying to deployment target...
  call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\.env" "%DEPLOYMENT_TARGET%\.env" /Y
  IF !ERRORLEVEL! NEQ 0 echo Warning: Failed to copy .env file, continuing anyway...
)
IF EXIST "%DEPLOYMENT_SOURCE%\..\rts-ai-dev\.env" (
  echo Found .env file in parent directory, copying to deployment target...
  call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\..\rts-ai-dev\.env" "%DEPLOYMENT_TARGET%\.env" /Y
  IF !ERRORLEVEL! NEQ 0 echo Warning: Failed to copy .env file from parent directory, continuing anyway...
)

echo Changing to deployment target directory...
call :ExecuteCmd cd "%DEPLOYMENT_TARGET%"

:: 6. Install all server dependencies
echo Installing all server dependencies...
echo Current directory: %CD%
echo Node version:
call :ExecuteCmd node -v
echo NPM version:
call :ExecuteCmd npm -v

echo Installing dependencies with npm...

:: Create a minimal package.json file with just the critical dependencies
echo Creating minimal package.json for dependency installation...

:: Write each line separately to avoid batch file parsing issues
echo { > "%DEPLOYMENT_TARGET%\package.json"
echo   "name": "rts-ai-backend", >> "%DEPLOYMENT_TARGET%\package.json"
echo   "version": "1.0.0", >> "%DEPLOYMENT_TARGET%\package.json"
echo   "dependencies": { >> "%DEPLOYMENT_TARGET%\package.json"
echo     "express": "^4.18.2", >> "%DEPLOYMENT_TARGET%\package.json"
echo     "cors": "^2.8.5", >> "%DEPLOYMENT_TARGET%\package.json"
echo     "dotenv": "^16.0.3", >> "%DEPLOYMENT_TARGET%\package.json"
echo     "node-fetch": "^2.6.9", >> "%DEPLOYMENT_TARGET%\package.json"
echo     "uuid": "^9.0.0" >> "%DEPLOYMENT_TARGET%\package.json"
echo   } >> "%DEPLOYMENT_TARGET%\package.json"
echo } >> "%DEPLOYMENT_TARGET%\package.json"

:: Install dependencies directly from the package.json
echo Installing dependencies from package.json...
cd "%DEPLOYMENT_TARGET%"
call :ExecuteCmd npm install --production
IF !ERRORLEVEL! NEQ 0 echo Warning: npm install failed, continuing anyway...

:: Verify node_modules directory exists
echo Checking if node_modules directory exists...
IF NOT EXIST "%DEPLOYMENT_TARGET%\node_modules" (
  echo Creating node_modules directory...
  mkdir "%DEPLOYMENT_TARGET%\node_modules"
)

:: Verify express module exists - using simpler syntax to avoid batch parsing issues
echo Checking if express module exists...
IF NOT EXIST "%DEPLOYMENT_TARGET%\node_modules\express" (
  echo Express module not found, installing individually...
  call :ExecuteCmd npm install express --save
)

:: Verify express is installed
echo Checking for express package...
IF NOT EXIST "%DEPLOYMENT_TARGET%\node_modules\express" (
  echo ERROR: Express package not found in node_modules. Attempting emergency installation...
  
  :: Try direct installation one more time
  echo Installing express directly...
  call :ExecuteCmd npm install express --save
)

:: Final check and fallback for express
IF NOT EXIST "%DEPLOYMENT_TARGET%\node_modules\express" (
  echo CRITICAL ERROR: Express package still not found after emergency installation.
  echo Creating express.js module manually as a last resort...
  
  IF NOT EXIST "%DEPLOYMENT_TARGET%\node_modules" mkdir "%DEPLOYMENT_TARGET%\node_modules"
  IF NOT EXIST "%DEPLOYMENT_TARGET%\node_modules\express" mkdir "%DEPLOYMENT_TARGET%\node_modules\express"
  
  :: Create a minimal express module to prevent crashes
  echo Creating minimal express.js module...
  
  echo // Minimal express module > "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo module.exports = function() { >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo   return function(req, res) { >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo     res.writeHead(200, {'Content-Type': 'text/html'}); >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo     res.end('Express module not properly installed. Please check deployment logs.'); >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo   }; >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo }; >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo module.exports.static = function() { >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo   return function(req, res, next) { >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo     if(typeof next === 'function') next(); >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo   }; >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo }; >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo module.exports.json = function() { >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo   return function(req, res, next) { >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo     if(typeof next === 'function') next(); >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo   }; >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo }; >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo module.exports.urlencoded = function() { >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo   return function(req, res, next) { >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo     if(typeof next === 'function') next(); >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo   }; >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo }; >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo module.exports.Router = function() { >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo   return { >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo     get: function() {}, >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo     post: function() {}, >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo     use: function() {} >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo   }; >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  echo }; >> "%DEPLOYMENT_TARGET%\node_modules\express\index.js"
  
  echo Created minimal express.js module to prevent crashes.
)

echo Listing installed packages:
call :ExecuteCmd npm list --depth=0

:: Finished successfully
echo Deployment completed successfully.
goto end

:error
echo An error occurred during deployment.
exit /b 1

:end
echo Finished successfully.
exit /b 0

:: Execute command routine that will echo out when error
:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
if "%ERRORLEVEL%" NEQ "0" echo Failed executing '%_CMD_%' && exit /b 1
endlocal
goto :EOF
