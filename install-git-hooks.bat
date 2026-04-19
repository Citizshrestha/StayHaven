@echo off
REM Install Git Hooks for StayHaven (Windows)
REM This script sets up pre-commit hooks to prevent committing sensitive files

echo.
echo Installing Git Hooks for StayHaven...
echo.

REM Configure git to use our custom hooks directory
git config core.hooksPath .githooks

echo.
echo Git hooks installed successfully!
echo.
echo The pre-commit hook will now:
echo   - Prevent committing .env files
echo   - Warn about potential hardcoded secrets
echo   - Help keep your repository secure
echo.
echo To test it, try: git add Backend\.env ^&^& git commit -m "test"
echo (It should block the commit)
echo.
pause
