const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && pm2 logs --lines 200 --nostream`;
    let logData = '';
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            fs.writeFileSync('pm2_logs.txt', logData);
            conn.end();
            console.log('Saved to pm2_logs.txt');
        }).on('data', (data) => {
            logData += data.toString();
        }).stderr.on('data', (data) => {
            logData += data.toString();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
