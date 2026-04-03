@echo off
cd /d c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web\src\app\claims
del /q page-clean.tsx page-fixed.tsx page-temp.tsx page_final.tsx page_new.tsx 2>nul
echo Cleanup complete
cd /d c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web
call npm run build
