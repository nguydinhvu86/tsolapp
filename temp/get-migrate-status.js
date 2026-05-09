const fs = require('fs');
const { Client } = require('ssh2');
const conn = new Client();
const APP_PATH = '/www/wwwroot/inside.tsol.vn/tsolapp';
conn.on('ready', () => {
    const cmd = `cd ${APP_PATH} && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && (npx prisma migrate status > migrate_status.txt 2>&1 ; cat migrate_status.txt)`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('close', (code) => {
            fs.writeFileSync('temp/status_out.txt', dataStr);
            conn.end();
            process.exit(0);
        });
        stream.on('data', data => { dataStr += data.toString() });
        stream.stderr.on('data', data => { dataStr += data.toString() });
    });
}).connect({ host: '124.158.9.5', username: 'incall', password: 'P@ssw0rdVu' });
