const fs = require('fs');
const path = require('path');

const directories = [
  'apps/worker-web/styles',
  'apps/admin-web/styles',
  'apps/worker-web/src/components/ui',
  'apps/admin-web/src/components/ui',
  'apps/admin-web/src/app/demo',
  'apps/admin-web/src/app/claims'
];

directories.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`Created: ${dir}`);
});

console.log('All directories created successfully!');
