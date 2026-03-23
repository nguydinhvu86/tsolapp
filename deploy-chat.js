const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const FILES_TO_SYNC = [
    { local: './app/components/chat/ChatWindow.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/components/chat/ChatWindow.tsx' },
    { local: './app/chat/actions.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/chat/actions.ts' }
];

console.log('Connecting to server...');
conn.on('ready', () => {
    console.log('Connected! Starting SFTP...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        let uploaded = 0;
        FILES_TO_SYNC.forEach(file => {
            const localPath = path.resolve(__dirname, file.local);
            if (!fs.existsSync(localPath)) {
                console.error(`File không tồn tại: ${localPath}`);
                uploaded++;
                if (uploaded === FILES_TO_SYNC.length) triggerBuild();
                return;
            }

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
    console.log('Uploads complete. Triggering build and restart PM2...');
    let outputData = '';
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npm run build && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log(`Build stream closed with code: ${code}`);
            conn.end();
            process.exit(code === 0 ? 0 : 1);
        }).on('data', (data) => {
            const out = data.toString();
            process.stdout.write(out);
            outputData += out;
        }).stderr.on('data', (data) => {
            const errOut = data.toString();
            process.stderr.write(errOut);
            outputData += errOut;
        });
    });
}
