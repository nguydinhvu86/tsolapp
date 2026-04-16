const { Client } = require('ssh2');
const conn = new Client();

const BRANCH = 'main'; // Target branch
const APP_PATH = '/www/wwwroot/inside.tsol.vn/tsolapp';

conn.on('ready', () => {
    console.log(`Connected to Production Server. Fetching origin/${BRANCH} and rebuilding...`);

    const cmd = `cd ${APP_PATH} && ` +
        `chattr -i .user.ini 2>/dev/null || true && ` +
        `git fetch --all && ` +
        `git reset --hard origin/${BRANCH} && ` +
        `chattr +i .user.ini 2>/dev/null || true && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `npm install && ` +
        `npx prisma generate && ` +
        `npx prisma migrate deploy && ` +
        `npm run build && ` +
        `/www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`Deployment finished with code ${code}`);
            conn.end();
            process.exit(code);
        });
        stream.on('data', data => process.stdout.write(data.toString()));
        stream.stderr.on('data', data => process.stderr.write(data.toString()));
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
