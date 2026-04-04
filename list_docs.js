const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('ls -la /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/documents/ | head -n 10', (err, stream) => {
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
