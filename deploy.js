const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Executing remote update, build, and restart...');

    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
        `git fetch --all && ` +
        `git reset --hard origin/main && ` +
        `echo 'P@ssw0rdVu' | sudo -S rm -rf .next && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:/www/server/nodejs/v14.17.6/bin:$PATH && ` +
        `npm run build && ` +
        `/www/server/nodejs/v14.17.6/bin/pm2 restart contract-app`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        stream.on('close', (code, signal) => {
            conn.end();
            console.log('Deployment complete!');
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
