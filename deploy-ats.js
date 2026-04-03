const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Uploading files for ATS Module...');
    
    // First, let's create the necessary directories
    const mkDirCmd = `mkdir -p /www/wwwroot/inside.tsol.vn/tsolapp/app/hr/recruitment/requisitions && ` +
                     `mkdir -p /www/wwwroot/inside.tsol.vn/tsolapp/app/hr/recruitment/pipeline`;
    
    conn.exec(mkDirCmd, (err, stream) => {
        if (err) throw err;
        
        stream.on('close', () => {
            console.log('Created ATS directories on remote server.');
            
            conn.sftp((err, sftp) => {
                if (err) throw err;

                const filesToUpload = [
                    { local: 'C:/Users/admin/Documents/CONTRACT/prisma/schema.prisma', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/prisma/schema.prisma' },
                    { local: 'C:/Users/admin/Documents/CONTRACT/app/components/layout/Sidebar.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/components/layout/Sidebar.tsx' },
                    { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/recruitment/requisitions/page.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/recruitment/requisitions/page.tsx' },
                    { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/recruitment/requisitions/actions.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/recruitment/requisitions/actions.ts' },
                    { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/recruitment/requisitions/RequisitionClient.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/recruitment/requisitions/RequisitionClient.tsx' },
                    { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/recruitment/pipeline/page.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/recruitment/pipeline/page.tsx' },
                    { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/recruitment/pipeline/actions.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/recruitment/pipeline/actions.ts' },
                    { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/recruitment/pipeline/PipelineClient.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/recruitment/pipeline/PipelineClient.tsx' },
                    { local: 'C:/Users/admin/Documents/CONTRACT/app/hr/recruitment/pipeline/CandidateDetailModal.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/recruitment/pipeline/CandidateDetailModal.tsx' }
                ];

                let uploadedCount = 0;

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
