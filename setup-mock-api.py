"""
Reorganize mock API files into proper directory structure
Alternative to reorganize.bat for cross-platform support
"""

import os
import shutil
from pathlib import Path

def main():
    print("\n" + "="*50)
    print("   Suraksha Weekly - Mock API Setup")
    print("="*50 + "\n")

    base_dir = Path(__file__).parent
    os.chdir(base_dir)
    
    # Step 1: Create API directories
    print("Step 1: Creating API directories...")
    worker_api_dir = Path("apps/worker/src/lib/api")
    admin_api_dir = Path("apps/admin/src/lib/api")
    
    worker_api_dir.mkdir(parents=True, exist_ok=True)
    admin_api_dir.mkdir(parents=True, exist_ok=True)
    print("[OK] Directories created\n")

    # Step 2: Move worker app files
    print("Step 2: Moving worker app files...")
    worker_lib = Path("apps/worker/src/lib")
    
    # Move mock-handlers
    src = worker_lib / "api-mock-handlers.ts"
    dst = worker_api_dir / "mock-handlers.ts"
    if src.exists():
        shutil.move(str(src), str(dst))
        print(f"[OK] Moved {src.name} to api/mock-handlers.ts")
    else:
        print(f"[SKIP] {src.name} already moved or not found")
    
    # Move client
    src = worker_lib / "api-client.ts"
    dst = worker_api_dir / "client.ts"
    if src.exists():
        shutil.move(str(src), str(dst))
        print(f"[OK] Moved {src.name} to api/client.ts")
    else:
        print(f"[SKIP] {src.name} already moved or not found")
    print()

    # Step 3: Move admin app files
    print("Step 3: Moving admin app files...")
    admin_lib = Path("apps/admin/src/lib")
    
    # Move mock-handlers
    src = admin_lib / "api-mock-handlers.ts"
    dst = admin_api_dir / "mock-handlers.ts"
    if src.exists():
        shutil.move(str(src), str(dst))
        print(f"[OK] Moved {src.name} to api/mock-handlers.ts")
    else:
        print(f"[SKIP] {src.name} already moved or not found")
    
    # Move client
    src = admin_lib / "api-client.ts"
    dst = admin_api_dir / "client.ts"
    if src.exists():
        shutil.move(str(src), str(dst))
        print(f"[OK] Moved {src.name} to api/client.ts")
    else:
        print(f"[SKIP] {src.name} already moved or not found")
    print()

    # Step 4: Copy .env.demo to .env.production
    print("Step 4: Copying .env.demo to .env.production...")
    
    worker_env_demo = Path("apps/worker/.env.demo")
    worker_env_prod = Path("apps/worker/.env.production")
    if worker_env_demo.exists():
        shutil.copy2(str(worker_env_demo), str(worker_env_prod))
        print("[OK] Worker .env.production created")
    else:
        print("[ERROR] apps/worker/.env.demo not found")
    
    admin_env_demo = Path("apps/admin/.env.demo")
    admin_env_prod = Path("apps/admin/.env.production")
    if admin_env_demo.exists():
        shutil.copy2(str(admin_env_demo), str(admin_env_prod))
        print("[OK] Admin .env.production created")
    else:
        print("[ERROR] apps/admin/.env.demo not found")
    print()

    # Summary
    print("="*50)
    print("   Mock API Setup Complete!")
    print("="*50 + "\n")
    
    print("Files organized:")
    print("  - apps/worker/src/lib/api/mock-handlers.ts")
    print("  - apps/worker/src/lib/api/client.ts")
    print("  - apps/admin/src/lib/api/mock-handlers.ts")
    print("  - apps/admin/src/lib/api/client.ts")
    print("  - .env.production files created\n")
    
    print("Next steps:")
    print("  1. Update your components to import from '@/lib/api/client'")
    print("  2. Test builds: npm run build")
    print("  3. Deploy to Vercel\n")
    
    print("See docs/MOCK_API_SETUP.md for full documentation\n")

if __name__ == "__main__":
    main()
