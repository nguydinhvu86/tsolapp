const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `tail -n 1000 /home/incall/.pm2/logs/inside.tsol.vn-out.log`;
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
