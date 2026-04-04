const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Fetching raw error logs...');

    const cmd = `grep '362551552' -B 50 -A 20 ~/.pm2/logs/inside.tsol.vn-error.log`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('close', (code, signal) => {
            require('fs').writeFileSync('prod-error.log', dataStr);
            console.log('Done writing prod-error.log');
            conn.end();
        }).on('data', (data) => {
            dataStr += data.toString();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
