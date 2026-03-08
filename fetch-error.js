const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Fetching logs...');
    // pipe error log to a text file, then cat it without tail to avoid garbling
    const cmd = `cat ~/.pm2/logs/inside.tsol.vn-error.log | tail -n 250 > /www/wwwroot/inside.tsol.vn/tsolapp/dump.txt && cat /www/wwwroot/inside.tsol.vn/tsolapp/dump.txt`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('close', (code, signal) => {
            fs.writeFileSync('prod-error.log', dataStr);
            console.log('Saved to prod-error.log');
            conn.end();
        }).on('data', (data) => {
            dataStr += data.toString();
        }).stderr.on('data', (data) => {
            console.error('STDERR: ' + data);
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
