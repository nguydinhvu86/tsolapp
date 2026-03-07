const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Uploading files...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        const filesToUpload = [
            { local: 'C:/Users/admin/Documents/CONTRACT/app/components/PushNotificationListener.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/components/PushNotificationListener.tsx' },
            { local: 'C:/Users/admin/Documents/CONTRACT/lib/mailer.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/lib/mailer.ts' },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/api/email/track/route.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/api/email/track/route.ts' }
        ];

        let uploadedCount = 0;

        filesToUpload.forEach(file => {
            sftp.fastPut(file.local, file.remote, (err) => {
                if (err) throw err;
                console.log(`Uploaded ${file.local}`);
                uploadedCount++;

                if (uploadedCount === filesToUpload.length) {
                    console.log('All files uploaded. Starting build and restart...');
                    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npm run build && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

                    conn.exec(cmd, (err, stream) => {
                        if (err) throw err;

                        stream.on('data', (data) => process.stdout.write(data.toString()));
                        stream.stderr.on('data', (data) => process.stderr.write(data.toString()));

                        stream.on('close', (code) => {
                            console.log(`\nDeployment finished with code ${code}`);
                            conn.end();
                        });
                    });
                }
            });
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
