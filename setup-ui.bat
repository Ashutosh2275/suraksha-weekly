@echo off
setlocal enabledelayedexpansion

cd /d "c:\Users\ASUS\Desktop\suraksha-weekly"

echo Step 1: Creating directory structure...
mkdir shared\ui\src\components 2>nul
echo Created: shared\ui\src\components

echo Step 2: Copying UI component files...
set count=0
for %%F in (AmountDisplay.tsx Badge.tsx Button.tsx Card.tsx Input.tsx Modal.tsx OTPInput.tsx Select.tsx Skeleton.tsx StatusBar.tsx Toast.tsx index.ts) do (
    if exist "apps\worker\src\components\ui\%%F" (
        copy "apps\worker\src\components\ui\%%F" "shared\ui\src\components\%%F" > nul
        echo   Copied: %%F
        set /a count=!count!+1
    )
)
echo Successfully copied %count% files

echo Step 3: Creating package.json...
(
echo {
echo   "name": "@suraksha/ui",
echo   "version": "0.1.0",
echo   "private": true,
echo   "main": "./src/components/index.ts",
echo   "types": "./src/components/index.ts",
echo   "exports": {
echo     ".": "./src/components/index.ts"
echo   },
echo   "dependencies": {
echo     "clsx": "^2.1.0",
echo     "tailwind-merge": "^2.2.1"
echo   },
echo   "peerDependencies": {
echo     "react": "^18.3.1",
echo     "react-dom": "^18.3.1"
echo   }
echo }
) > shared\ui\package.json
echo Created: shared\ui\package.json

echo Step 4: Creating tsconfig.json...
(
echo {
echo   "extends": "../../tsconfig.base.json",
echo   "compilerOptions": {
echo     "jsx": "react-jsx",
echo     "baseUrl": ".",
echo     "paths": {
echo       "@/*": ["./src/*"]
echo     }
echo   },
echo   "include": ["src"],
echo   "exclude": ["node_modules"]
echo }
) > shared\ui\tsconfig.json
echo Created: shared\ui\tsconfig.json

echo.
echo ======================================
echo ✓ All steps completed successfully!
echo ======================================
echo.
echo Created structure:
echo shared\ui\
echo   ├── package.json
echo   ├── tsconfig.json
echo   └── src\
echo       └── components\
dir /s /b shared\ui\src\components\* | findstr /R ".*\." >nul && (
    for /r shared\ui\src\components %%F in (*) do echo           ├── %%~nxF
)
echo.
echo ✓ Setup complete!
pause
