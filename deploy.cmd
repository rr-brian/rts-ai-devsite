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

:: 3. Copy server.js, server directory first (API routes take priority)
echo Copying server.js and server directory first...

echo Copying server.js
call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\server.js" "%DEPLOYMENT_TARGET%\server.js" /Y
IF !ERRORLEVEL! NEQ 0 goto error

echo Creating server directory
IF NOT EXIST "%DEPLOYMENT_TARGET%\server" (
  call :ExecuteCmd mkdir "%DEPLOYMENT_TARGET%\server"
  IF !ERRORLEVEL! NEQ 0 goto error
)

echo Copying server directory contents
call :ExecuteCmd xcopy "%DEPLOYMENT_SOURCE%\server" "%DEPLOYMENT_TARGET%\server" /E /Y
IF !ERRORLEVEL! NEQ 0 goto error

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

:: 4. Copy web.config file and other critical files (api-routes.js, api-test.html)
echo Copying web.config to deployment target...
call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\web.config" "%DEPLOYMENT_TARGET%\web.config" /Y
IF !ERRORLEVEL! NEQ 0 goto error


echo Copying api-test.html to deployment target...
call :ExecuteCmd copy "%DEPLOYMENT_SOURCE%\api-test.html" "%DEPLOYMENT_TARGET%\api-test.html" /Y
IF !ERRORLEVEL! NEQ 0 goto error

echo Test files have been removed after successful debugging

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

:: 5. Create a package.json file in the deployment target
echo Creating package.json in the deployment target...
call :ExecuteCmd cd "%DEPLOYMENT_TARGET%"

echo { > package.json
echo   "name": "rts-ai", >> package.json
echo   "version": "1.0.0", >> package.json
echo   "description": "RTS AI Chatbot", >> package.json
echo   "main": "server.js", >> package.json
echo   "dependencies": { >> package.json
echo     "express": "^4.18.2", >> package.json
echo     "path": "^0.12.7", >> package.json
echo     "cors": "^2.8.5", >> package.json
echo     "dotenv": "^16.3.1", >> package.json
echo     "mssql": "^9.1.1", >> package.json
echo     "uuid": "^9.0.0", >> package.json
echo     "node-fetch": "^2.6.7" >> package.json
echo   }, >> package.json
echo   "engines": { >> package.json
echo     "node": "^20.0.0" >> package.json
echo   } >> package.json
echo } >> package.json

:: 6. Install all server dependencies
echo Installing all server dependencies...
call :ExecuteCmd npm install --production
IF !ERRORLEVEL! NEQ 0 goto error

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
