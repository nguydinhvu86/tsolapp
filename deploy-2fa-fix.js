const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Uploading 2FA fix files...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        const files = [
            {
                local: 'C:/Users/admin/Documents/CONTRACT/lib/authOptions.ts',
                remote: '/www/wwwroot/inside.tsol.vn/tsolapp/lib/authOptions.ts'
            },
            {
                local: 'C:/Users/admin/Documents/CONTRACT/app/api/users/2fa/verify/route.ts',
                remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/api/users/2fa/verify/route.ts'
            }
        ];

        let uploaded = 0;

        files.forEach(file => {
            sftp.fastPut(file.local, file.remote, (err) => {
                if (err) throw err;
                console.log(`Uploaded ${file.local}`);
                uploaded++;

                if (uploaded === files.length) {
                    console.log('All files uploaded. Running build...');

                    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
                        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
                        `rm -f /www/wwwroot/inside.tsol.vn/tsolapp/phase1_layout.tsx && ` +
                        `rm -f /www/wwwroot/inside.tsol.vn/tsolapp/app/phase1_layout.tsx && ` +
                        `npm run build && ` +
                        `/www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

                    console.log('Executing:', cmd);
                    conn.exec(cmd, (err, execStream) => {
                        if (err) throw err;

                        execStream.on('data', (data) => process.stdout.write(data.toString()));
                        execStream.stderr.on('data', (data) => process.stderr.write(data.toString()));

                        execStream.on('close', (code) => {
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
