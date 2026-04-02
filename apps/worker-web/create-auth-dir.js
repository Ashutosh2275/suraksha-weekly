// Script to create auth directory
const fs = require('fs');
const path = require('path');

const authDir = path.join(__dirname, 'src', 'app', '(auth)');
fs.mkdirSync(authDir, { recursive: true });
console.log('Created directory:', authDir);
