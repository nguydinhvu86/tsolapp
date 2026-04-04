const cp = require('child_process');

try {
    console.log("Backing up branch...");
    try { cp.execSync('git branch backup_pre_reset', { stdio: 'inherit' }); } catch(e) {}

    console.log("Resetting to origin/main...");
    cp.execSync('git reset origin/main', { stdio: 'inherit' });
    
    console.log("Adding specific folders...");
    cp.execSync('git add app/ lib/ prisma/ middleware.ts *.js *.ts', { stdio: 'inherit' });
    
    try {
        console.log("Unstaging potentially huge files...");
        cp.execSync('git reset *.tar.gz *.zip', { stdio: 'inherit' });
    } catch(e) {}
    
    console.log("Committing...");
    try {
        cp.execSync('git commit -m "feat(system): Full sync of Task detail email tracking, SideBar avatars and Monitoring modules"', { stdio: 'inherit' });
    } catch(e) {}

    console.log("Pushing...");
    cp.execSync('git push origin main', { stdio: 'inherit' });
    console.log("Push successful!");
} catch (e) {
    console.error("Git error:", e.message);
}
