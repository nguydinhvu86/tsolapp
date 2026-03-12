const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('cd /www/wwwroot/inside.tsol.vn/tsolapp && chattr -i .user.ini 2>/dev/null || true && git reset --hard && git clean -fd && git fetch --all && git checkout main && git reset --hard origin/main && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npx prisma migrate deploy && npx prisma generate && npm run build && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn && chattr +i .user.ini 2>/dev/null || true', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', data => process.stdout.write(data.toString()));
        stream.stderr.on('data', data => process.stderr.write(data.toString()));
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
