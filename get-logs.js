const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Fetching logs...');
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npx prisma migrate deploy`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        const fs = require('fs');
        // ... 
        stream.on('close', (code, signal) => {
            conn.end();
            console.log('done writing to local_pm2.txt');
        }).on('data', (data) => {
            fs.appendFileSync('local_pm2.txt', data.toString());
        }).stderr.on('data', (data) => {
            fs.appendFileSync('local_pm2.txt', data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
