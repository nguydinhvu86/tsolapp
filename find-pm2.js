const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `echo '${password}' | sudo -S find /www/server -name "pm2" -type l -o -type f -executable | grep bin/pm2`;

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
            console.log("\nFound PM2 paths:\n", out);
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
