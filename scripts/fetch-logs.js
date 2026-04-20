const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

conn.on('ready', () => {
    // Fetch the last 1000 lines of the PM2 error log
    conn.exec('tail -n 2000 ~/.pm2/logs/inside.tsol.vn-error.log', (err, stream) => {
        if (err) throw err;
        let logData = '';
        stream.on('data', data => logData += data.toString());
        stream.on('close', () => {
            fs.writeFileSync('prod-error.log', logData);
            console.log('Logs fetched to prod-error.log');
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
