const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    // Search for Node binaries
    const cmd = `echo '${password}' | sudo -S find /www/server -name "node" -type f -executable | grep bin/node`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('close', (code) => {
            console.log("Found Node paths:\n", out);
            conn.end();
        }).on('data', (data) => {
            out += data.toString();
        }).stderr.on('data', (data) => {
            console.error("stderr:", data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
