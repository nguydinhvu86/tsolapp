const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

console.log('Local UTC Time:', new Date().toISOString());

conn.on('ready', () => {
    conn.exec('date -u +"%Y-%m-%dT%H:%M:%SZ"', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            conn.end();
        }).on('data', (data) => {
            console.log('Server UTC Time: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password,
    readyTimeout: 10000
});
