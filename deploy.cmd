@if "%_ECHO%" == ""  @echo off

setlocal enabledelayedexpansion

echo Deployment started

:: Verify node.js installed
where node 2>nul >nul
IF !ERRORLEVEL! NEQ 0 (
  echo Missing node.js executable, please install node.js, if already installed make sure it can be reached from current environment.
  goto error
)

:: Setup
:: -----

setlocal enabledelayedexpansion

SET ARTIFACTS=%~dp0%.\artifacts

IF NOT DEFINED DEPLOYMENT_SOURCE (
  SET DEPLOYMENT_SOURCE=%~dp0%.
)

IF NOT DEFINED DEPLOYMENT_TARGET (
  SET DEPLOYMENT_TARGET=%ARTIFACTS%\wwwroot
)

IF NOT DEFINED NEXT_MANIFEST_PATH (
  SET NEXT_MANIFEST_PATH=%ARTIFACTS%\manifest

  IF NOT DEFINED PREVIOUS_MANIFEST_PATH (
    SET PREVIOUS_MANIFEST_PATH=%ARTIFACTS%\manifest
  )
)

echo Using PowerShell deployment script for more reliable deployment...

:: Execute PowerShell deployment script
powershell -ExecutionPolicy Unrestricted -File "%DEPLOYMENT_SOURCE%\deploy.ps1"
IF !ERRORLEVEL! NEQ 0 (
  echo PowerShell deployment script failed with error !ERRORLEVEL!
  goto error
)

:: Post deployment stub
IF DEFINED POST_DEPLOYMENT_ACTION call "%POST_DEPLOYMENT_ACTION%"
IF !ERRORLEVEL! NEQ 0 goto error

goto end

:error
endlocal
echo An error has occurred during web site deployment.
exit /b 1

:end
endlocal
echo Finished successfully.
