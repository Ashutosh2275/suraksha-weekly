const fs = require('fs');
const path = require('path');

// Create demo directory
const demoDir = path.join(__dirname, 'apps', 'admin-web', 'src', 'app', 'demo');
fs.mkdirSync(demoDir, { recursive: true });

// Create claims directory
const claimsDir = path.join(__dirname, 'apps', 'admin-web', 'src', 'app', 'claims');
fs.mkdirSync(claimsDir, { recursive: true });

console.log('Directories created successfully');