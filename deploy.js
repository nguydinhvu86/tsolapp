const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    // AAPanel requires Node 24 for prisma and next build
    const deployCmd = `cd /www/wwwroot/erp.tsol.vn && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `git pull origin main && ` +
        `npm run build && ` +
        `/www/server/nvm/versions/node/v24.14.0/bin/node /www/server/nvm/versions/node/v24.14.0/bin/pm2 restart erp-tsol`;

    conn.exec(deployCmd, (err2, stream2) => {
        stream2.on('data', d => process.stdout.write(d.toString()));
        stream2.stderr.on('data', d => process.stderr.write(d.toString()));
        stream2.on('close', (code) => {
            if (code !== 0) {
                console.error(`Command failed with exit code ${code}`);
            } else {
                console.log("Deployed successfully on remote server");
            }
            conn.end();
        });
    });
}).connect({
    host: '192.168.10.40',
    port: 22,
    username: 'root1',
    password: ''
});
