import subprocess
import os
import sys

os.chdir(r"c:\Users\ASUS\Desktop\suraksha-weekly")

print("=" * 60)
print("Clean Install Monorepo Dependencies")
print("=" * 60)

print("\nStep 1: Cleanup complete (previous operation)")
print("[INFO] Removed old node_modules and lock files")

print("\n" + "=" * 60)
print("Step 2: Running npm install with --legacy-peer-deps")
print("=" * 60)
print()

try:
    result = subprocess.run(
        "npm install --legacy-peer-deps", 
        shell=True,
        timeout=600,  # 10 minute timeout
        capture_output=True,
        text=True
    )
    
    # Print full output
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr)
    
    if result.returncode == 0:
        print("\n[OK] npm install completed successfully")
    else:
        print(f"\n[ERROR] npm install failed with return code {result.returncode}")
        sys.exit(1)
        
except subprocess.TimeoutExpired:
    print("[ERROR] npm install timed out after 10 minutes")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Unexpected error: {e}")
    sys.exit(1)

print("\n" + "=" * 60)
print("Step 3: Verifying installation")
print("=" * 60)

# Check if node_modules exists
if os.path.exists("node_modules"):
    print("[OK] root node_modules exists")
else:
    print("[ERROR] root node_modules not found")
    sys.exit(1)

print("\n" + "=" * 60)
print("Step 4: Directory structure")
print("=" * 60)

print("\nDirectory: apps/")
if os.path.exists("apps"):
    for item in sorted(os.listdir("apps")):
        item_path = os.path.join("apps", item)
        if os.path.isdir(item_path):
            print(f"  [DIR] {item}")

print("\nDirectory: packages/")
if os.path.exists("packages"):
    for item in sorted(os.listdir("packages")):
        item_path = os.path.join("packages", item)
        if os.path.isdir(item_path):
            print(f"  [DIR] {item}")

print("\nDirectory: shared/")
if os.path.exists("shared"):
    for item in sorted(os.listdir("shared")):
        item_path = os.path.join("shared", item)
        if os.path.isdir(item_path):
            print(f"  [DIR] {item}")

print("\n" + "=" * 60)
print("Installation complete!")
print("=" * 60)
