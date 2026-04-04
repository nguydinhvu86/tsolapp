const cp = require('child_process');
const run = cmd => {
    console.log('Running:', cmd);
    cp.execSync(cmd, { stdio: 'inherit' });
};

try {
    run('git reset HEAD~1');
    
    // Unstage everything
    run('git restore --staged .');
    
    // Add specifically
    run('git add app public prisma lib');
    
    // If the contract RAR is added, this will throw it away but it shouldn't be added since we didn't use '.'
    run('git commit -m "Fix signature layout, capture metadata, swap role positions"');
    
    console.log('Pushing to GitHub...');
    run('git push origin main');
    console.log('Done!');
} catch (e) {
    console.error('Failed', e.message);
}
