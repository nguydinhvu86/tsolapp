const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
    conn.exec('grep -ri "CALL_IN" /root/.pm2/logs/', (err, stream) => {
        if (err) throw err;
        stream.on('data', data => process.stdout.write(data.toString()));
        stream.on('close', () => {
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
