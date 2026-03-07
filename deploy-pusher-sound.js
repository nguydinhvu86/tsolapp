const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Uploading new PushNotificationListener.tsx...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        const localPath = 'C:/Users/admin/Documents/CONTRACT/app/components/PushNotificationListener.tsx';
        const remotePath = '/www/wwwroot/inside.tsol.vn/tsolapp/app/components/PushNotificationListener.tsx';

        sftp.fastPut(localPath, remotePath, (err) => {
            if (err) throw err;
            console.log('File uploaded. Starting build and restart...');

            // Build with Node v24 and PM2 restart with correct path and app name
            const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npm run build && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

            conn.exec(cmd, (err, stream) => {
                if (err) throw err;

                stream.on('data', (data) => {
                    process.stdout.write(data.toString());
                });

                stream.stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });

                stream.on('close', (code) => {
                    console.log(`\nDeployment finished with code ${code}`);
                    conn.end();
                });
            });
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
