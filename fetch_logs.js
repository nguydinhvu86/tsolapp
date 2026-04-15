const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

conn.on('ready', () => {
    conn.exec('export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && /www/server/nodejs/v14.17.6/bin/pm2 logs inside.tsol.vn --lines 200 --nostream', (err, stream) => {
        if (err) throw err;
        let logData = '';
        stream.on('data', data => logData += data.toString());
        stream.on('close', () => {
            fs.writeFileSync('prod-error.log', logData);
            console.log('Logs fetched to prod-error.log');
            conn.end();
        });
        stream.stderr.on('data', data => console.error(data.toString()));
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
