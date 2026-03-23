const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const FILES_TO_SYNC = [
    { local: './prisma/schema.prisma', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/prisma/schema.prisma' }
];

console.log('Connecting to server...');
conn.on('ready', () => {
    console.log('Connected! Starting SFTP...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        let uploaded = 0;
        FILES_TO_SYNC.forEach(file => {
            const localPath = path.resolve(__dirname, file.local);
            sftp.fastPut(localPath, file.remote, (err) => {
                if (err) {
                    console.error(`Lỗi upload ${file.local}:`, err);
                } else {
                    console.log(`Uploaded: ${file.local}`);
                }
                uploaded++;
                if (uploaded === FILES_TO_SYNC.length) {
                    triggerBuild();
                }
            });
        });
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});

function triggerBuild() {
    console.log('Uploads complete. Running prisma generate and restarting PM2...');
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npx prisma db push --accept-data-loss && npm run build && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`Stream closed with code: ${code}`);
            conn.end();
            process.exit(code);
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}
