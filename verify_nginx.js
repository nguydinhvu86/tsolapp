const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('echo "P@ssw0rdVu" | sudo -S grep "uploads" /www/server/panel/vhost/nginx/inside.tsol.vn.conf', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end())
        .on('data', data => process.stdout.write(data))
        .stderr.on('data', data => process.stderr.write(data));
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
