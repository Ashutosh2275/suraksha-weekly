#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys

os.chdir(r"c:\Users\ASUS\Desktop\suraksha-weekly")

print("=" * 60)
print("Step 1: Removing old dependencies")
print("=" * 60)

# Remove package-lock.json from root
if os.path.exists("package-lock.json"):
    os.remove("package-lock.json")
    print("✓ Deleted package-lock.json")
else:
    print("ℹ package-lock.json not found")

# Remove package-lock.json from apps/api
if os.path.exists("apps/api/package-lock.json"):
    os.remove("apps/api/package-lock.json")
    print("✓ Deleted apps/api/package-lock.json")

# Remove node_modules from root
if os.path.exists("node_modules"):
    shutil.rmtree("node_modules")
    print("✓ Deleted root node_modules")
else:
    print("ℹ root node_modules not found")

# Remove node_modules from all workspace directories
workspace_dirs = [
    "apps/worker",
    "apps/admin", 
    "apps/landing",
    "apps/api",
    "packages/db-schema",
    "packages/shared-types",
    "shared/ui",
    "shared/types",
    "shared/fastapi_common"
]

for dir_path in workspace_dirs:
    node_modules_path = os.path.join(dir_path, "node_modules")
    if os.path.exists(node_modules_path):
        shutil.rmtree(node_modules_path)
        print(f"✓ Deleted {node_modules_path}")

print("\n" + "=" * 60)
print("Step 2: Running npm install")
print("=" * 60 + "\n")

result = subprocess.run("npm install", shell=True)
if result.returncode != 0:
    print("\n[ERROR] npm install failed")
    sys.exit(1)

print("\n" + "=" * 60)
print("Step 3: Verifying installation")
print("=" * 60)

if os.path.exists("node_modules"):
    print("✓ root node_modules exists")
    node_modules_size = sum(os.path.getsize(os.path.join(dirpath,filename)) 
                           for dirpath, dirnames, filenames in os.walk("node_modules") 
                           for filename in filenames)
    print(f"  Size: {node_modules_size / (1024*1024):.1f} MB")
else:
    print("[ERROR] root node_modules not found")
    sys.exit(1)

print("\n" + "=" * 60)
print("Step 4: Directory structure")
print("=" * 60)

print("\nDirectory: apps/")
for item in sorted(os.listdir("apps")):
    if os.path.isdir(os.path.join("apps", item)):
        print(f"  📁 {item}")
        
print("\nDirectory: packages/")
for item in sorted(os.listdir("packages")):
    if os.path.isdir(os.path.join("packages", item)):
        print(f"  📁 {item}")

print("\nDirectory: shared/")
for item in sorted(os.listdir("shared")):
    if os.path.isdir(os.path.join("shared", item)):
        print(f"  📁 {item}")

print("\n" + "=" * 60)
print("✓ Installation complete!")
print("=" * 60)
