const cp = require('child_process');
const fs = require('fs');

try {
    cp.execSync('npx prisma validate', { stdio: 'pipe' });
    fs.writeFileSync('clean_err.txt', 'OK');
} catch (e) {
    let errStr = e.stdout ? e.stdout.toString() : '';
    errStr += '\n' + (e.stderr ? e.stderr.toString() : '');
    // simple ansi strip
    errStr = errStr.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    fs.writeFileSync('clean_err.txt', errStr);
}
