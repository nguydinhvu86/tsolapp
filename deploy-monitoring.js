const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const FILES_TO_SYNC = [
    { local: './prisma/schema.prisma', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/prisma/schema.prisma' },
    { local: './app/hr/monitoring/actions.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/monitoring/actions.ts' },
    { local: './app/hr/monitoring/MonitoringClient.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/hr/monitoring/MonitoringClient.tsx' },
    { local: './app/api/users/heartbeat/route.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/api/users/heartbeat/route.ts' },
    { local: './app/components/layout/Header.tsx', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/components/layout/Header.tsx' },
    { local: './app/actions/auth.ts', remote: '/www/wwwroot/inside.tsol.vn/tsolapp/app/actions/auth.ts' }
];

console.log('Connecting to server...');
conn.on('ready', () => {
    console.log('Connected! Creating necessary directories...');
    
    // Make sure new directories exist
    conn.exec('mkdir -p /www/wwwroot/inside.tsol.vn/tsolapp/app/actions /www/wwwroot/inside.tsol.vn/tsolapp/app/api/users/heartbeat /www/wwwroot/inside.tsol.vn/tsolapp/app/hr/monitoring /www/wwwroot/inside.tsol.vn/tsolapp/app/components/layout /www/wwwroot/inside.tsol.vn/tsolapp/prisma', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Directories checked. Starting SFTP...');
            conn.sftp((err, sftp) => {
                if (err) throw err;

                let uploaded = 0;
                FILES_TO_SYNC.forEach(file => {
                    const localPath = path.resolve(__dirname, file.local);
                    if (!fs.existsSync(localPath)) {
                        console.error(`File không tồn tại: ${localPath}`);
                        uploaded++;
                        if (uploaded === FILES_TO_SYNC.length) triggerBuild();
                        return;
                    }

                    sftp.fastPut(localPath, file.remote, (err) => {
                        if (err) {
                            console.error(`Lỗi upload ${file.local}:`, err);
                        } else {
                            console.log(`Uploaded: ${file.local}`);
                        }

                        uploaded++;
                        if (uploaded === FILES_TO_SYNC.length) {
                            triggerBuild();
                        }
                    });
                });
            });
        }).on('data', console.log).stderr.on('data', console.error);
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});

function triggerBuild() {
    console.log('Uploads complete. Running Prisma DB Push, Build and Restart PM2...');
    // Add prisma db push to ensure schema changes (new logoutAt column) are applied safely without dropping data
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npx prisma db push --accept-data-loss && npm run build && pm2 restart inside.tsol.vn`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log(`Build stream closed with code: ${code}`);
            conn.end();
            process.exit(code === 0 ? 0 : 1);
        }).on('data', (data) => {
            const out = data.toString();
            process.stdout.write(out);
        }).stderr.on('data', (data) => {
            const errOut = data.toString();
            process.stderr.write(errOut);
        });
    });
}
