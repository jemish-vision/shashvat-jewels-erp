/**
 * Robust .next directory cleanup for Windows.
 * Tries multiple strategies because file locks prevent simple deletion.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nextDir = path.join(process.cwd(), '.next');

if (!fs.existsSync(nextDir)) {
  process.exit(0);
}

// Strategy 1: Try Node.js native recursive delete
try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  if (!fs.existsSync(nextDir)) process.exit(0);
} catch (e) {
  // Fall through
}

// Strategy 2: Try Windows native rd command
try {    execSync(`if exist "${nextDir}" rd /s /q "${nextDir}"`, { stdio: 'ignore', shell: 'cmd.exe' });
  if (!fs.existsSync(nextDir)) process.exit(0);
} catch (e) {
  // Fall through
}

// Strategy 3: Try again after a brief delay (files might be released)
setTimeout(() => {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    if (!fs.existsSync(nextDir)) process.exit(0);
  } catch (e) {
    // Fall through
  }

  // Strategy 4: Rename the directory (works if directory itself isn't locked)
  try {
    const bakDir = nextDir + '.bak';
    fs.renameSync(nextDir, bakDir);
    // Schedule background cleanup of the renamed directory
    setTimeout(() => {
      try { fs.rmSync(bakDir, { recursive: true, force: true }); } catch (e) {}
    }, 10000);
    process.exit(0);
  } catch (e) {
    console.error('Could not clean .next directory. Please stop all node processes and manually delete it.');
    process.exit(1);
  }
}, 1000);
