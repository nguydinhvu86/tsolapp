const { Client } = require('ssh2');
const conn = new Client();

const APP_PATH = '/www/wwwroot/inside.tsol.vn/tsolapp';

conn.on('ready', () => {
    const cmd = `cd ${APP_PATH} && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `npx prisma migrate deploy > err.log 2>&1 ; cat err.log`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', data => output += data.toString());
        stream.on('close', (code) => {
            console.log("FULL LOG:\n", output);
            conn.end();
            process.exit(0);
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
