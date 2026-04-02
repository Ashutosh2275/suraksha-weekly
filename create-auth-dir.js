const fs = require('fs');
const path = require('path');

const authDir = path.join(__dirname, 'apps', 'worker-web', 'src', 'app', '(auth)');
fs.mkdirSync(authDir, { recursive: true });
console.log('Created:', authDir);
console.log('Directory exists:', fs.existsSync(authDir));
