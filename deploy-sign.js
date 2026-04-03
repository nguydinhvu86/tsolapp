const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    // Deploying with DB Push explicitly to create the 3 new metadata columns
    const deployCmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `git fetch origin && git reset --hard origin/main && ` +
        `npm install && ` +
        `npx prisma db push --accept-data-loss && ` +
        `npx prisma generate && ` +
        `npm run build && ` +
        `npx pm2 reload all`;

    console.log("Executing remote deployment with database schema push...");
    conn.exec(deployCmd, (err2, stream2) => {
        stream2.on('data', d => process.stdout.write(d.toString()));
        stream2.stderr.on('data', d => process.stderr.write(d.toString()));
        stream2.on('close', (code) => {
            if (code !== 0) {
                console.error(`Command failed with exit code ${code}`);
            } else {
                console.log("Deployed successfully and Prisma synced on remote server 124.158.9.5");
            }
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
