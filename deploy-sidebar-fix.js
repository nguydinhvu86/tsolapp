const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Uploading Sidebar fix...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        const filesToUpload = [
            { local: 'C:/Users/admin/Documents/CONTRACT/app/components/layout/Sidebar.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/components/layout/Sidebar.tsx' },
            { local: 'C:/Users/admin/Documents/CONTRACT/lib/utils/cn.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/lib/utils/cn.ts' }
        ];

        let uploadedCount = 0;

        // Ensure directories exist
        conn.exec('mkdir -p /www/wwwroot/inside.tsol.vn/tsolapp/lib/utils', (err, stream) => {
            if (err) throw err;
            stream.on('data', (d) => { });
            stream.stderr.on('data', (d) => { });
            stream.on('close', () => {
                filesToUpload.forEach(file => {
                    sftp.fastPut(file.local, file.remote, (err) => {
                        if (err) throw err;
                        console.log(`Uploaded ${file.local}`);
                        uploadedCount++;

                        if (uploadedCount === filesToUpload.length) {
                            console.log('All files uploaded. Running Build...');

                            const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
                                `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
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
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
