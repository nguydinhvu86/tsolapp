const { execSync } = require('child_process');
try {
    const output = execSync('npx auto-bind ts-node prisma/seed.ts', { encoding: 'utf-8', stdio: 'pipe' });
    console.log(output);
} catch (error) {
    console.log('STDOUT:', error.stdout);
    console.log('STDERR:', error.stderr);
}
