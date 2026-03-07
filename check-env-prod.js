const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `cat /www/wwwroot/inside.tsol.vn/tsolapp/.env | grep NEXT_PUBLIC_APP_URL`;

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
            console.log("\nEnv content:\n", out || "(Empty)");
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
