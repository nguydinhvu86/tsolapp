const { Client } = require('ssh2');
const conn = new Client();

const BRANCH = 'main';
const DIRECTORY = '/www/wwwroot/inside.tsol.vn/tsolapp';

conn.on('ready', () => {
    console.log(`Connected to Production Server. Fetching origin/${BRANCH} and rebuilding...`);

    // AAPanel locks .user.ini so git clean -fd fails. We must unlock it first, or just run git reset with AAPanel specific commands
    const cmd = `cd ${DIRECTORY} && ` +
        `chattr -i .user.ini 2>/dev/null || true && ` +
        `git fetch --all && ` +
        `git checkout -f ${BRANCH} && ` +
        `git reset --hard origin/${BRANCH} && ` +
        `chattr +i .user.ini 2>/dev/null || true && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `npm install && ` +
        `(echo 'P@ssw0rdVu' | sudo -S chown -R incall:incall .next 2>/dev/null || true) && ` +
        `(echo 'P@ssw0rdVu' | sudo -S chmod -R 777 .next 2>/dev/null || true) && ` +
        `npx prisma generate && ` +
        `node scripts/safe-apply-db.js && ` +
        `(npx prisma migrate deploy 2>/dev/null || true) && ` +
        `npm run build && ` +
        `/www/server/nodejs/v14.17.6/bin/pm2 restart contract-app || /www/server/nodejs/v14.17.6/bin/pm2 restart all`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log(`\nDeployment process closed with code ${code}`);
            conn.end();
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
