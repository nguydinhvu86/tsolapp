const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('tail -n 10 /www/wwwlogs/inside.tsol.vn.error.log', (err, stream) => {
        stream.on('data', (d) => {
            console.log(d.toString());
        }).on('close', () => conn.end());
    });
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
