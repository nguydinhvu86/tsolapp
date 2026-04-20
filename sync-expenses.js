const { Client } = require('ssh2');
const conn = new Client();
const fs = require('fs');
const path = require('path');

const REMOTE_BASE = '/www/wwwroot/inside.tsol.vn/tsolapp';

const FILES_TO_SYNC = [
    { local: 'app/sales/expenses/page.tsx', remote: `${REMOTE_BASE}/app/sales/expenses/page.tsx` },
    { local: 'app/sales/expenses/actions.ts', remote: `${REMOTE_BASE}/app/sales/expenses/actions.ts` },
    { local: 'app/sales/expenses/ExpenseClient.tsx', remote: `${REMOTE_BASE}/app/sales/expenses/ExpenseClient.tsx` }
];

conn.on('ready', () => {
    console.log('SSH connection ready. Starting SFTP...');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        let uploaded = 0;
        FILES_TO_SYNC.forEach(file => {
            sftp.fastPut(file.local, file.remote, (err) => {
                if (err) {
                    console.error("Failed to upload", file.local, err);
                } else {
                    console.log(`Uploaded ${file.local} to ${file.remote}`);
                }
                uploaded++;
                if (uploaded === FILES_TO_SYNC.length) {
                    console.log("All files uploaded. Rebuilding and restarting...");
                    const cmd = `cd ${REMOTE_BASE} && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npm run build && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;
                    conn.exec(cmd, (err, stream) => {
                        if (err) throw err;
                        stream.on('close', (code, signal) => {
                            console.log(`Command closed with code ${code}`);
                            conn.end();
                        }).on('data', (data) => {
                            process.stdout.write(data.toString());
                        }).stderr.on('data', (data) => {
                            process.stderr.write(data.toString());
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
    password: 'P@ssw0rdVu'
});
