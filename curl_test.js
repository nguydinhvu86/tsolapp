const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('curl -I http://127.0.0.1:6688/uploads/avatars/7c7-1775301732227.jpg', (err, stream) => {
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
