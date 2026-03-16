const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected. Running pm2 logs command...');

    // Fetch specifically the app error log
    const cmd = `/www/server/nodejs/v14.17.6/bin/pm2 logs inside.tsol.vn --lines 500 --nostream`;

    let logData = '';

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            fs.writeFileSync('app-logs.txt', logData);
            console.log('Wrote to app-logs.txt');
            conn.end();
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
