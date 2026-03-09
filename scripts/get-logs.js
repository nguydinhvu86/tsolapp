const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

conn.on('ready', () => {
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npx prisma db push --accept-data-loss && npx prisma generate && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', data => process.stdout.write(data.toString()));
        stream.on('close', () => conn.end());
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
