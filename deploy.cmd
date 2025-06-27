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

:: 5.1 Copy package.json from source to deployment target if it exists
echo Checking for package.json in source...
IF EXIST "%DEPLOYMENT_SOURCE%\package.json" (
  echo Found package.json, copying to deployment target...
  call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\package.json" "%DEPLOYMENT_TARGET%\package.json.full" /Y
  IF !ERRORLEVEL! NEQ 0 goto error
)

:: 5.2 Copy .env file if it exists
echo Checking for .env file in source...
IF EXIST "%DEPLOYMENT_SOURCE%\.env" (
  echo Found .env file, copying to deployment target...
  call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\.env" "%DEPLOYMENT_TARGET%\.env" /Y
  IF !ERRORLEVEL! NEQ 0 goto error
)
IF EXIST "%DEPLOYMENT_SOURCE%\..\rts-ai-dev\.env" (
  echo Found .env file in parent directory, copying to deployment target...
  call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\..\rts-ai-dev\.env" "%DEPLOYMENT_TARGET%\.env" /Y
  IF !ERRORLEVEL! NEQ 0 goto error
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

:: First, try to install express and other critical dependencies explicitly
echo Installing critical packages explicitly...
call :ExecuteCmd npm install express cors dotenv node-fetch uuid path --save
IF !ERRORLEVEL! NEQ 0 echo Warning: Critical package installation may have failed, continuing anyway...

:: Then install all other dependencies
echo Installing all production dependencies...
call :ExecuteCmd npm install --production
IF !ERRORLEVEL! NEQ 0 goto error

:: Force install again to be sure
echo Force installing critical dependencies again...
call :ExecuteCmd npm install express cors dotenv node-fetch uuid path --save --force
IF !ERRORLEVEL! NEQ 0 echo Warning: Force installation may have failed, continuing anyway...

:: Verify express is installed
echo Checking for express package...
IF NOT EXIST "%DEPLOYMENT_TARGET%\node_modules\express" (
  echo Express package not found, installing it separately...
  call :ExecuteCmd npm install express --save
  IF !ERRORLEVEL! NEQ 0 goto error
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
