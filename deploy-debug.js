const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Running checks.');

    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `echo "--- GIT STATUS ---" && git status && ` +
        `echo "--- PULLING ---" && git pull origin main && ` +
        `echo "--- PRISMA GENERATE ---" && npx prisma generate && ` +
        `echo "--- BUILDING ---" && npm run build`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
