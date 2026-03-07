const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Uploading File...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        const localPath = 'C:/Users/admin/Documents/CONTRACT/app/components/PushNotificationListener.tsx';
        const remotePath = '/www/wwwroot/inside.tsol.vn/tsolapp/app/components/PushNotificationListener.tsx';

        sftp.fastPut(localPath, remotePath, (err) => {
            if (err) throw err;
            console.log('File uploaded. Starting build and restart...');

            // Execute build and restart. Loading user profile (.bashrc/.profile) to ensure node/npm/pm2 are in PATH.
            const cmd = `source ~/.bashrc; source ~/.profile 2>/dev/null; cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=$PATH:/www/server/nodejs/v20.18.3/bin && npm run build && pm2 restart next-app`;

            conn.exec(cmd, (err, stream) => {
                if (err) throw err;

                stream.on('data', (data) => {
                    process.stdout.write(data.toString());
                });

                stream.stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });

                stream.on('close', (code) => {
                    console.log(`\nBuild and Restart process finished with code ${code}`);
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
