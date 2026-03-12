const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('cd /www/wwwroot/inside.tsol.vn/tsolapp && git status && git log -1', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', data => console.log(data.toString()));
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
