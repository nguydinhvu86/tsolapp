const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('find /www -type d -name "documents" 2>/dev/null', (err, stream) => {
        stream.on('data', (d) => process.stdout.write(d.toString())).on('close', () => conn.end());
    });
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
