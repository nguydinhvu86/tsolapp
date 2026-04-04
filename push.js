const cp = require('child_process');
try {
    cp.execSync('git add app/sales/leads/actions.ts', { stdio: 'inherit' });
    cp.execSync('git commit -m "Fix Lead conversion creating orphan Customers"', { stdio: 'inherit' });
    cp.execSync('git push origin main', { stdio: 'inherit' });
    console.log("Git sync successful!");
} catch (e) {
    console.error("Git push failed", e.message);
}
