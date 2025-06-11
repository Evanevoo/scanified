@echo off
echo Starting Daily Backup for Gas Cylinder App...
echo.

REM Run the PowerShell backup script
powershell -ExecutionPolicy Bypass -File "backup.ps1"

echo.
echo Backup process completed!
pause 