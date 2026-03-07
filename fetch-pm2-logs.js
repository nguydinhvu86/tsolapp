const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `/www/server/nodejs/v14.17.6/bin/pm2 logs inside.tsol.vn --lines 50 --nostream`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', (data) => {
            out += data.toString();
        });
        stream.stderr.on('data', (data) => {
            console.error("stderr:", data.toString());
        });
        stream.on('close', (code) => {
            console.log("\nPM2 Logs:\n", out);
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
