const { Client } = require('ssh2');
const conn = new Client();

const APP_PATH = '/www/wwwroot/inside.tsol.vn/tsolapp';

conn.on('ready', () => {
    const cmd = `cd ${APP_PATH} && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `npx prisma db push --accept-data-loss && ` +
        `npx prisma migrate resolve --applied 20260416004934_add_multi_template && ` +
        `/www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', data => output += data.toString());
        stream.on('close', (code) => {
            console.log("FIXED DB SCHEMA AND RESOLVED MIGRATION:\n", output);
            conn.end();
            process.exit(code);
        });
        stream.stderr.on('data', data => {
            output += data.toString();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
