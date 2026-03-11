const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('cat /www/wwwroot/inside.tsol.vn/tsolapp/.env', (err, stream) => {
        let envData = '';
        stream.on('data', d => envData += d.toString());
        stream.on('close', () => {
            const match = envData.match(/DATABASE_URL="([^"]+)"/);
            const dbUrl = match[1];

            const dbCmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
                `/www/server/nvm/versions/node/v24.14.0/bin/node node_modules/.bin/prisma db execute --stdin --url "${dbUrl}"`;

            conn.exec(dbCmd, (err2, stream2) => {
                stream2.on('data', d => process.stdout.write(d.toString()));
                stream2.stderr.on('data', d => process.stderr.write(d.toString()));
                stream2.on('close', (code) => {
                    conn.exec('export PATH=/www/server/nodejs/v14.17.6/bin:$PATH && pm2 restart inside.tsol.vn', (e3, s3) => {
                        s3.on('data', d => process.stdout.write(d.toString()));
                        s3.on('close', () => conn.end());
                    });
                });

                stream2.stdin.write("SHOW TABLES LIKE 'LeadAssignee';\n");
                stream2.stdin.end();
            });
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
