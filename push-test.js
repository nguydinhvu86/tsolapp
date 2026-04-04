const cp = require('child_process');
const fs = require('fs');

try {
    console.log("Pushing...");
    const out = cp.execSync('git push origin main 2> error.txt', { stdio: 'inherit' });
    console.log("Push completed without throwing!");
} catch (e) {
    console.log("Push threw an error!");
}

if (fs.existsSync('error.txt')) {
    console.log(fs.readFileSync('error.txt', 'utf8'));
}
