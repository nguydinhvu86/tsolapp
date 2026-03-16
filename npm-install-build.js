const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Running npm install and build...');

    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `npm install && ` +
        `npm run build && ` +
        `/www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        stream.on('close', (code, signal) => {
            console.log('\nStream :: close :: code: ' + code);
            conn.end();
        }).on('data', (data) => process.stdout.write(data.toString()))
            .stderr.on('data', (data) => process.stderr.write(data.toString()));
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
