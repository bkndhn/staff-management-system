@echo off
REM First-time setup script for Git and GitHub connection

echo ========================================
echo   First-Time Git Setup
echo ========================================
echo.

REM Configure Git
echo Step 1: Configure Git
set /p git_name="Enter your name: "
set /p git_email="Enter your email: "

git config --global user.name "%git_name%"
git config --global user.email "%git_email%"

echo.
echo Git configured successfully!
echo.

REM Set up GitHub connection
echo Step 2: Connect to GitHub
echo.
echo Please create a GitHub repository first:
echo 1. Go to https://github.com/new
echo 2. Name: staff-management-system (or your choice)
echo 3. Set to Private
echo 4. DO NOT initialize with README
echo 5. Click "Create repository"
echo.
pause

echo.
set /p github_url="Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): "

REM Add remote
git remote add origin %github_url%

echo.
echo Setting up main branch...
git branch -M main

echo.
echo Creating initial commit...
git add .
git commit -m "Initial commit: Staff Management System"

echo.
echo Pushing to GitHub...
git push -u origin main

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Your project is now on GitHub!
echo.
echo Next steps:
echo 1. Go to https://vercel.com or https://netlify.com
echo 2. Import your GitHub repository
echo 3. Deploy automatically!
echo.
echo To update in the future, just run: deploy.bat
echo.
pause
