const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('ls -la /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/documents/', (err, stream) => {
        stream.on('data', (d) => console.log(d.toString())).on('close', () => conn.end());
    });
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
