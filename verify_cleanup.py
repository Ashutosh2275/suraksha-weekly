import os
import sys

os.chdir(r'c:\Users\ASUS\Desktop\suraksha-weekly')

# Clean up the temporary cleanup scripts we created
cleanup_scripts = ['cleanup.bat', 'cleanup_vercel.py']

print("Removing temporary cleanup scripts...")
for script in cleanup_scripts:
    if os.path.exists(script):
        os.remove(script)
        print(f"  OK - Deleted: {script}")

print("\n" + "=" * 60)
print("CLEANUP VERIFICATION")
print("=" * 60)

# Verify .venv is gone
print("\nVerifying .venv deletion...")
if os.path.exists('.venv'):
    print("  WARNING: .venv still exists")
else:
    print("  OK - .venv successfully deleted")

# Verify .pytest_cache is gone
print("\nVerifying .pytest_cache deletion...")
if os.path.exists('.pytest_cache'):
    print("  WARNING: .pytest_cache still exists")
else:
    print("  OK - .pytest_cache successfully deleted")

# Check for any remaining __pycache__ folders
print("\nScanning for remaining __pycache__ folders...")
pycache_remaining = []
for root, dirs, files in os.walk('.'):
    if '__pycache__' in dirs:
        pycache_remaining.append(os.path.join(root, '__pycache__'))

if pycache_remaining:
    print(f"  WARNING: Found {len(pycache_remaining)} remaining __pycache__ folders")
    for p in pycache_remaining:
        print(f"    - {p}")
else:
    print("  OK - No __pycache__ folders found")

# Verify target files are deleted
print("\nVerifying deleted root files...")
files_deleted = [
    'DEMO_VISUALIZATION.tsx',
    'start-dev.bat',
    'pytest.ini',
    'Makefile',
    'docker-compose.yml',
    '.dockerignore'
]

all_deleted = True
for f in files_deleted:
    if os.path.exists(f):
        print(f"  WARNING: {f} still exists")
        all_deleted = False
    else:
        print(f"  OK - {f} deleted")

# Verify important files are STILL there
print("\nVerifying PRESERVED files...")
files_to_keep = [
    '.env.example',
    '.env.demo',
    'package.json',
    'package-lock.json',
    'README.md'
]

all_preserved = True
for f in files_to_keep:
    if os.path.exists(f):
        print(f"  OK - {f} preserved")
    else:
        print(f"  ERROR: {f} was deleted (should be kept!)")
        all_preserved = False

# Verify important directories are STILL there
print("\nVerifying PRESERVED directories...")
dirs_to_keep = ['.github', 'apps', 'services', 'shared', 'tests']

all_dirs_ok = True
for d in dirs_to_keep:
    if os.path.exists(d):
        print(f"  OK - {d}/ preserved")
    else:
        print(f"  ERROR: {d}/ was deleted (should be kept!)")
        all_dirs_ok = False

print("\n" + "=" * 60)
print("ROOT-LEVEL DIRECTORY STRUCTURE (After Cleanup)")
print("=" * 60)

visible_dirs = sorted([d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')])
print("\nFolders:")
for d in visible_dirs:
    print(f"  {d}/")

print("\n" + "=" * 60)
print("VERIFICATION SUMMARY")
print("=" * 60)
if all_deleted and all_preserved and all_dirs_ok and pycache_remaining == []:
    print("\n  SUCCESS - All cleanup completed successfully!")
else:
    print("\n  Some issues detected (see above)")

print("\n" + "=" * 60)
