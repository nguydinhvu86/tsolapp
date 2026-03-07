const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    // Curl localhost:6688/api/upload directly
    const cmd = `echo '${password}' | sudo -S curl -X POST -F "file=@/dev/null" -s -w "%{http_code}" http://127.0.0.1:6688/api/upload`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('close', () => {
            console.log("Result:", out);
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
