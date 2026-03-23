const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const password = 'P@ssw0rdVu'; // NOTE: The actual password found in deployment scripts

conn.on('ready', () => {
    console.log('Connected to server. Uploading CustomerDetailClient.tsx...');

    conn.sftp((err, sftp) => {
        if (err) throw err;

        const localFile = path.join(__dirname, 'app', 'customers', '[id]', 'CustomerDetailClient.tsx');
        const remoteFile = '/www/wwwroot/inside.tsol.vn/tsolapp/app/customers/[id]/CustomerDetailClient.tsx';

        sftp.fastPut(localFile, remoteFile, (err) => {
            if (err) throw err;
            console.log(`Uploaded ${localFile} to ${remoteFile}`);

            console.log('Running build...');
            conn.exec('cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npm run build && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn', (err, stream) => {
                if (err) throw err;
                stream.on('close', (code, signal) => {
                    console.log('Deployment finished with code ' + code);
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data);
                }).stderr.on('data', (data) => {
                    process.stderr.write(data);
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
