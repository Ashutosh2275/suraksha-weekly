#!/usr/bin/env python3
import os
import shutil
from pathlib import Path

os.chdir(r'C:\Users\ASUS\Desktop\suraksha-weekly')

# 1. Create _archive\apps directory
archive_apps = Path('_archive/apps')
archive_apps.mkdir(parents=True, exist_ok=True)
print('✓ Created _archive/apps directory')

# 2. Move apps/admin to _archive/apps/admin
admin_src = Path('apps/admin')
admin_dst = Path('_archive/apps/admin')
if admin_src.exists() and not admin_dst.exists():
    shutil.move(str(admin_src), str(admin_dst))
    print('✓ Moved apps/admin → _archive/apps/admin')

# 3. Rename apps/admin-web to apps/admin
admin_web = Path('apps/admin-web')
admin_new = Path('apps/admin')
if admin_web.exists() and not admin_new.exists():
    admin_web.rename(admin_new)
    print('✓ Renamed apps/admin-web → apps/admin')

# 4. Rename apps/worker-web to apps/worker
worker_web = Path('apps/worker-web')
worker_new = Path('apps/worker')
if worker_web.exists() and not worker_new.exists():
    worker_web.rename(worker_new)
    print('✓ Renamed apps/worker-web → apps/worker')

# 5. Rename apps/web to apps/landing
web = Path('apps/web')
landing = Path('apps/landing')
if web.exists() and not landing.exists():
    web.rename(landing)
    print('✓ Renamed apps/web → apps/landing')

print()
print('===============================')
print('FINAL DIRECTORY STRUCTURE')
print('===============================')

print()
print('📁 Contents of apps/:')
apps_dir = Path('apps')
for item in sorted(apps_dir.iterdir()):
    if item.is_dir():
        print(f'  📂 {item.name}')

print()
print('📁 Contents of _archive/apps/:')
archive_apps_dir = Path('_archive/apps')
items = list(archive_apps_dir.iterdir()) if archive_apps_dir.exists() else []
if items:
    for item in sorted(items):
        if item.is_dir():
            print(f'  📂 {item.name}')
else:
    print('  (empty)')
