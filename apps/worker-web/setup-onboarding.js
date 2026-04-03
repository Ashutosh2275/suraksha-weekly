const fs = require('fs');
const path = require('path');

// Create store directory
const storeDir = path.join(__dirname, 'src', 'store');
if (!fs.existsSync(storeDir)) {
  fs.mkdirSync(storeDir, { recursive: true });
  console.log('✓ Created src/store directory');
} else {
  console.log('✓ src/store directory already exists');
}

console.log('Setup complete!');
