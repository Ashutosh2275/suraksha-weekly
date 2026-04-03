@echo off
echo ========================================
echo SURAKSHA WEEKLY - ONBOARDING WIZARD SETUP
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install zustand canvas-confetti framer-motion
call npm install --save-dev @types/canvas-confetti

echo.
echo [2/4] Creating store directory...
if not exist "src\store" mkdir "src\store"
echo Directory created: src\store

echo.
echo [3/4] MANUAL STEP REQUIRED:
echo Please copy the content from ONBOARDING_STORE_CODE.txt
echo to: src\store\onboarding.ts
echo.
pause

echo.
echo [4/4] MANUAL STEP REQUIRED:
echo Please copy the content from ONBOARDING_NEW_PAGE.txt
echo to: src\app\(auth)\onboarding\page.tsx
echo (Replace the entire file content)
echo.
pause

echo.
echo ========================================
echo SETUP COMPLETE!
echo ========================================
echo.
echo Next steps:
echo 1. Start the dev server: npm run dev
echo 2. Navigate to: http://localhost:3000/onboarding
echo 3. Test all 4 steps of the wizard
echo.
echo See ONBOARDING_IMPLEMENTATION_SUMMARY.md for:
echo - Full testing checklist
echo - Troubleshooting guide
echo - Feature documentation
echo.
pause
