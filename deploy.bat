@echo off
REM Quick Deploy Script - Push changes to GitHub and auto-deploy

echo ========================================
echo   Staff Management - Quick Deploy
echo ========================================
echo.

REM Check if Git is configured
git config user.name >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git user not configured!
    echo Please run: git config --global user.name "Your Name"
    echo             git config --global user.email "your.email@example.com"
    pause
    exit /b 1
)

REM Check git status
echo Checking changes...
git status

echo.
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update: Changes made on %date% %time%

echo.
echo Adding all changes...
git add .

echo.
echo Committing changes...
git commit -m "%commit_msg%"

echo.
echo Pushing to GitHub...
git push

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Your changes have been pushed to GitHub.
echo Vercel/Netlify will automatically deploy in 2-3 minutes.
echo.
pause
