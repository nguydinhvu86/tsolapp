const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';
const remoteAppPath = '/www/wwwroot/inside.tsol.vn/tsolapp';

conn.on('ready', () => {
    console.log('Connected to server. Reverting Font Fixes...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        const filesToUpload = [
            { local: 'C:/Users/admin/Documents/CONTRACT/app/components/layout/Sidebar.tsx', remote: `${remoteAppPath}/app/components/layout/Sidebar.tsx` },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/components/tasks/TaskPanel.tsx', remote: `${remoteAppPath}/app/components/tasks/TaskPanel.tsx` },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/dashboard/DashboardClient.tsx', remote: `${remoteAppPath}/app/dashboard/DashboardClient.tsx` },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/globals.css', remote: `${remoteAppPath}/app/globals.css` },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/tasks/[id]/TaskDetailClient.tsx', remote: `${remoteAppPath}/app/tasks/[id]/TaskDetailClient.tsx` },
            { local: 'C:/Users/admin/Documents/CONTRACT/app/tasks/TaskDashboardClient.tsx', remote: `${remoteAppPath}/app/tasks/TaskDashboardClient.tsx` },
            { local: 'C:/Users/admin/Documents/CONTRACT/tailwind.config.ts', remote: `${remoteAppPath}/tailwind.config.ts` }
        ];

        let uploadedCount = 0;

        filesToUpload.forEach(file => {
            sftp.fastPut(file.local, file.remote, (err) => {
                if (err) {
                    console.error(`Error uploading ${file.local}:`, err);
                    return;
                }
                console.log(`Uploaded ${file.local}`);
                uploadedCount++;

                if (uploadedCount === filesToUpload.length) {
                    console.log('Files uploaded. Running build...');

                    const cmd = `cd ${remoteAppPath} && ` +
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
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
