const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Uploading updated mailer.ts...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        const localPath = 'C:/Users/admin/Documents/CONTRACT/lib/mailer.ts';
        const remotePath = '/www/wwwroot/inside.tsol.vn/tsolapp/lib/mailer.ts';

        sftp.fastPut(localPath, remotePath, (err) => {
            if (err) throw err;
            console.log('File uploaded. Adding NEXT_PUBLIC_APP_URL to .env and starting build & restart...');

            // Append NEXT_PUBLIC_APP_URL to .env if missing, then build and restart
            const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && 
                         if ! grep -q "NEXT_PUBLIC_APP_URL" ".env"; then 
                             echo "NEXT_PUBLIC_APP_URL=https://inside.tsol.vn" >> .env; 
                         fi &&
                         export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && 
                         npm run build && 
                         /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

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
