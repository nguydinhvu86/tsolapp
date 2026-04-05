const fs = require('fs');
const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('cd /www/wwwroot/inside.tsol.vn/tsolapp && git status -s', (err, stream) => {
        let out = '';
        stream.on('data', data => out += data.toString());
        stream.on('close', () => { fs.writeFileSync('remote-status.txt', out); conn.end(); });
    });
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
