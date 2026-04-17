const fs = require('fs');
const { execSync } = require('child_process');

console.log('Installing worker dependencies...');
execSync('npm install --no-audit --no-fund', { cwd: 'apps/web', stdio: 'inherit' });

console.log('Installing admin dependencies...');
execSync('npm install --no-audit --no-fund', { cwd: 'apps/admin', stdio: 'inherit' });

console.log('Building Worker App...');
execSync('npm run build', { cwd: 'apps/web', stdio: 'inherit' });

console.log('Building Admin App...');
execSync('npm run build', { cwd: 'apps/admin', stdio: 'inherit' });

console.log('Preparing combined /dist folder...');
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist', { recursive: true });

fs.cpSync('apps/web/out', 'dist', { recursive: true });
fs.cpSync('apps/admin/out', 'dist', { recursive: true });

console.log('Combined build ready in /dist');
