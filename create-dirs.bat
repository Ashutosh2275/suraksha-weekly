@echo off
REM Create API directories for worker and admin apps

echo Creating API directories...

mkdir apps\worker\src\lib\api 2>nul
mkdir apps\admin\src\lib\api 2>nul

echo Moving mock-handlers.ts to api directory...
move apps\worker\src\lib\api-mock-handlers.ts apps\worker\src\lib\api\mock-handlers.ts 2>nul

echo Done!
