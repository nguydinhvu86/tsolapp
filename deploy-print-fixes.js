const { Client } = require('ssh2');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Get modified files from git
let modifiedFiles = [];
try {
    const diff = execSync('git diff --name-only').toString();
    modifiedFiles = diff.split('\n').map(f => f.trim()).filter(f => f.length > 0 && f.endsWith('.tsx'));
} catch (e) {
    console.error("Failed to get modified files from git:", e);
    process.exit(1);
}

if (modifiedFiles.length === 0) {
    console.log("No .tsx files modified.");
    process.exit(0);
}

const FILES_TO_SYNC = modifiedFiles.map(file => ({
    local: `./${file}`,
    remote: `/www/wwwroot/inside.tsol.vn/tsolapp/${file}`
}));

console.log(`Found ${FILES_TO_SYNC.length} modified files to sync.`);

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected via SSH. Starting SFTP upload...');
    conn.sftp((err, sftp) => {
        if (err) throw err;

        let uploaded = 0;
        FILES_TO_SYNC.forEach(file => {
            const localPath = path.resolve(__dirname, file.local);
            if (!fs.existsSync(localPath)) {
                console.log(`Skipping missing local file: ${localPath}`);
                uploaded++;
                if (uploaded === FILES_TO_SYNC.length) triggerBuild();
                return;
            }

            sftp.fastPut(localPath, file.remote, (err) => {
                if (err) {
                    console.error(`Error uploading ${file.local}:`, err);
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
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});

function triggerBuild() {
    console.log('Uploads complete. Rebuilding Next.js and restarting PM2 (no Prisma commands)...');
    
    // Completely safe rebuild. No git pull, no db push.
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npm run build && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`Deployment finished with code: ${code}`);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}
