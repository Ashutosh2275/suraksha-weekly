@echo off
cd /d "C:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web"
echo Running TypeScript type check...
call npm run type-check
echo.
echo Running Next.js build...
call npm run build
