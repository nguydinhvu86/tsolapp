const cp = require('child_process');

try {
    console.log("Resetting git to previous commit...");
    cp.execSync('git reset HEAD~1', { stdio: 'inherit' });
} catch(e) { }

try {
    console.log("Staging specific known safe files...");
    cp.execSync('git add app/ prisma/ lib/ middleware.ts deploy-hotfix.js', { stdio: 'inherit' });

    console.log("Committing...");
    cp.execSync('git commit -m "feat(system): Deploy new Email Tracking, User Monitoring and Sidebar UI"', { stdio: 'inherit' });
    
    console.log("Pushing to origin main...");
    cp.execSync('git push origin main', { stdio: 'inherit' });
    console.log("Push successful!");
} catch (e) {
    console.error("Git error:", e.message);
}
