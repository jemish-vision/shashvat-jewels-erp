const { execSync } = require('child_process');
const port = process.argv[2] || '4000';
try {
  const output = execSync(`netstat -ano | findstr :${port}`, { shell: 'cmd.exe', encoding: 'utf-8' });
  const lines = output.split('\n').filter(l => l.includes('LISTENING'));
  for (const line of lines) {
    const pid = line.trim().split(/\s+/).pop();
    if (pid && pid !== '0') {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch (e) {}
    }
  }
} catch (e) {}
