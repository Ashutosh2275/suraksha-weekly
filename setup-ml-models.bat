@echo off
echo Creating ML Models directory and page...

REM Create the directory
mkdir "c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web\src\app\ml-models" 2>nul

REM Copy the page file
copy "c:\Users\ASUS\Desktop\suraksha-weekly\ml-models-page.tsx" "c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web\src\app\ml-models\page.tsx"

echo ML Models page created successfully!
echo Location: apps\admin-web\src\app\ml-models\page.tsx