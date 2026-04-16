#!/usr/bin/env python3
import os
import shutil
import json
from pathlib import Path

# Change to the project directory
os.chdir(r"c:\Users\ASUS\Desktop\suraksha-weekly")

print("\n" + "="*50)
print("Step 1: Creating directory structure...")
print("="*50)

# Create directory structure
ui_components_dir = Path("shared/ui/src/components")
ui_components_dir.mkdir(parents=True, exist_ok=True)
print(f"✓ Directory structure created: {ui_components_dir}")

# Copy UI component files
print("\n" + "="*50)
print("Step 2: Copying UI component files...")
print("="*50)

source_dir = Path("apps/worker/src/components/ui")
target_dir = Path("shared/ui/src/components")

files_to_copy = [
    "AmountDisplay.tsx",
    "Badge.tsx",
    "Button.tsx",
    "Card.tsx",
    "Input.tsx",
    "Modal.tsx",
    "OTPInput.tsx",
    "Select.tsx",
    "Skeleton.tsx",
    "StatusBar.tsx",
    "Toast.tsx",
    "index.ts"
]

copied_count = 0
for file in files_to_copy:
    source_path = source_dir / file
    target_path = target_dir / file
    
    if source_path.exists():
        shutil.copy2(source_path, target_path)
        print(f"  ✓ Copied: {file}")
        copied_count += 1
    else:
        print(f"  ✗ Not found: {file}")

print(f"\n✓ Successfully copied {copied_count} files")

# Create package.json
print("\n" + "="*50)
print("Step 3: Creating package.json...")
print("="*50)

package_json = {
    "name": "@suraksha/ui",
    "version": "0.1.0",
    "private": True,
    "main": "./src/components/index.ts",
    "types": "./src/components/index.ts",
    "exports": {
        ".": "./src/components/index.ts"
    },
    "dependencies": {
        "clsx": "^2.1.0",
        "tailwind-merge": "^2.2.1"
    },
    "peerDependencies": {
        "react": "^18.3.1",
        "react-dom": "^18.3.1"
    }
}

package_json_path = Path("shared/ui/package.json")
with open(package_json_path, 'w', encoding='utf-8') as f:
    json.dump(package_json, f, indent=2)

print(f"✓ Created: {package_json_path}")

# Create tsconfig.json
print("\n" + "="*50)
print("Step 4: Creating tsconfig.json...")
print("="*50)

tsconfig = {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "jsx": "react-jsx",
        "baseUrl": ".",
        "paths": {
            "@/*": ["./src/*"]
        }
    },
    "include": ["src"],
    "exclude": ["node_modules"]
}

tsconfig_path = Path("shared/ui/tsconfig.json")
with open(tsconfig_path, 'w', encoding='utf-8') as f:
    json.dump(tsconfig, f, indent=2)

print(f"✓ Created: {tsconfig_path}")

# Summary
print("\n" + "="*50)
print("✓ All steps completed successfully!")
print("="*50)

print("\nCreated structure:")
print("shared/ui/")
print("  ├── package.json")
print("  ├── tsconfig.json")
print("  └── src/")
print("      └── components/")

# List component files
for file in sorted(target_dir.glob("*")):
    if file.is_file():
        print(f"          ├── {file.name}")

print("\n✓ Setup complete!")
