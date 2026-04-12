const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('ls -la /www/server/nodejs/*/bin/pm2 && ls -la /root/.pm2/logs/', (err, stream) => {
        let output = '';
        stream.on('data', d => output += d);
        stream.stderr.on('data', d => output += d);
        stream.on('close', () => {
            console.log(output);
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
