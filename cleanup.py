#!/usr/bin/env python3
import os
import subprocess

# Change to claims directory
claims_dir = r'c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web\src\app\claims'
os.chdir(claims_dir)

# Delete temporary files
temp_files = [
    'page-clean.tsx',
    'page-fixed.tsx', 
    'page-temp.tsx',
    'page_final.tsx',
    'page_new.tsx'
]

print("Deleting temporary files...")
for f in temp_files:
    if os.path.exists(f):
        os.remove(f)
        print(f"  Deleted: {f}")
    else:
        print(f"  File not found: {f}")

# List remaining files
print("\nRemaining files in claims directory:")
for f in os.listdir('.'):
    if f.endswith('.tsx'):
        print(f"  {f}")

# Change to admin-web directory and run build
os.chdir(r'c:\Users\ASUS\Desktop\suraksha-weekly\apps\admin-web')
print("\nRunning npm run build...")
result = subprocess.run(['npm', 'run', 'build'], capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)
print(f"Build exit code: {result.returncode}")
