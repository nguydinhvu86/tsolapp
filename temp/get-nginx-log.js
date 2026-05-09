const { Client } = require('ssh2');
const conn = new Client();
const fs = require('fs');
conn.on('ready', () => {
    conn.exec('tail -n 100 /www/wwwlogs/inside.tsol.vn.error.log', (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('close', (code) => {
            fs.writeFileSync('temp/nginx_err.txt', dataStr);
            conn.end();
        });
        stream.on('data', data => { dataStr += data.toString() });
        stream.stderr.on('data', data => { dataStr += data.toString() });
    });
}).connect({ host: '124.158.9.5', username: 'incall', password: 'P@ssw0rdVu' });
