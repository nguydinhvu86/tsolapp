const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('cat /www/wwwroot/inside.tsol.vn/tsolapp/.env', (err, stream) => {
        let envData = '';
        stream.on('data', d => envData += d.toString());
        stream.on('close', () => {
            const match = envData.match(/DATABASE_URL="([^"]+)"/);
            const dbUrl = match[1];

            // Bypass npx and use Node 24 directly with the local prisma binary
            const dbCmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
                `/www/server/nvm/versions/node/v24.14.0/bin/node node_modules/.bin/prisma db execute --file apply.sql --url "${dbUrl}"`;

            conn.exec(dbCmd, (err2, stream2) => {
                stream2.on('data', d => process.stdout.write(d.toString()));
                stream2.stderr.on('data', d => process.stderr.write(d.toString()));
                stream2.on('close', (code) => {
                    if (code !== 0) {
                        console.error(`Command failed with exit code ${code}`);
                    } else {
                        console.log("SQL successfully executed on remote Database");
                    }
                    conn.end();
                });
            });
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
