const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Uploading files for HR Monitoring...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        const filesToUpload = [
            { local: 'C:/Users/admin/Documents/CONTRACT/prisma/schema.prisma', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/prisma/schema.prisma' },
            { local: 'C:/Users/admin/Documents/CONTRACT/lib/authOptions.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/lib/authOptions.ts' },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/components/PushNotificationListener.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/components/PushNotificationListener.tsx' },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/monitoring/page.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/monitoring/page.tsx' },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/monitoring/actions.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/monitoring/actions.ts' },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/monitoring/MonitoringClient.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/monitoring/MonitoringClient.tsx' },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/monitoring/ping.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/monitoring/ping.ts' },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/users/actions.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/users/actions.ts' },
            { local: 'C:/Users/admin/Documents/CONTRACT/prisma/seed.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/prisma/seed.ts' },
            { local: 'C:/Users/admin/Documents/CONTRACT/setup-admin.js', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/setup-admin.js' }
        ];

        let uploadedCount = 0;

        // Ensure target directory exists for new files
        conn.exec('mkdir -p /www/wwwroot/inside.tsol.vn/tsolapp/app/hr/monitoring', (err, stream) => {
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
                            console.log('All files uploaded. Running Prisma and Build...');

                            const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
                                `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
                                `npx prisma db push --accept-data-loss && ` +
                                `npx prisma generate && ` +
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
