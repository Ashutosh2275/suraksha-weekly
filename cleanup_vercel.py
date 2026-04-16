#!/usr/bin/env python3
import os
import shutil
import sys
from pathlib import Path

def cleanup_vercel():
    os.chdir(r'c:\Users\ASUS\Desktop\suraksha-weekly')
    
    print("=" * 50)
    print("CLEANING UP CODEBASE FOR VERCEL DEPLOYMENT")
    print("=" * 50)
    
    deleted_items = []
    not_found = []
    
    # Folders to delete
    print("\n--- DELETING FOLDERS ---\n")
    folders_to_delete = ['.venv', '.pytest_cache']
    
    for folder in folders_to_delete:
        if os.path.exists(folder):
            try:
                shutil.rmtree(folder)
                print(f"✓ Deleted: {folder}")
                deleted_items.append(folder)
            except Exception as e:
                print(f"✗ Error deleting {folder}: {e}")
        else:
            not_found.append(folder)
    
    # Find and delete all __pycache__ folders
    print("\n--- DELETING ALL __pycache__ FOLDERS ---\n")
    for root, dirs, files in os.walk('.'):
        if '__pycache__' in dirs:
            pycache_path = os.path.join(root, '__pycache__')
            try:
                shutil.rmtree(pycache_path)
                print(f"✓ Deleted: {pycache_path}")
                deleted_items.append(pycache_path)
            except Exception as e:
                print(f"✗ Error deleting {pycache_path}: {e}")
    
    # Files to delete
    print("\n--- DELETING ROOT-LEVEL FILES ---\n")
    files_to_delete = [
        'DEMO_VISUALIZATION.tsx',
        'start-dev.bat',
        'pytest.ini',
        'Makefile',
        'docker-compose.yml',
        '.dockerignore'
    ]
    
    for file in files_to_delete:
        if os.path.exists(file):
            try:
                os.remove(file)
                print(f"✓ Deleted: {file}")
                deleted_items.append(file)
            except Exception as e:
                print(f"✗ Error deleting {file}: {e}")
        else:
            not_found.append(file)
    
    # Summary
    print("\n" + "=" * 50)
    print("CLEANUP SUMMARY")
    print("=" * 50)
    print(f"\nTotal items deleted: {len(deleted_items)}")
    
    if not_found:
        print(f"\nItems not found ({len(not_found)}):")
        for item in not_found:
            print(f"  - {item}")
    
    print("\n--- DELETED ITEMS ---")
    for item in deleted_items:
        print(f"  ✓ {item}")
    
    print("\n" + "=" * 50)
    print("CLEANUP COMPLETE!")
    print("=" * 50 + "\n")

if __name__ == '__main__':
    cleanup_vercel()
