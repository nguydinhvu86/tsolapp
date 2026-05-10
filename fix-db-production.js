const { Client } = require('ssh2');
const conn = new Client();

const APP_PATH = '/www/wwwroot/inside.tsol.vn/tsolapp';

conn.on('ready', () => {
    console.log('Connected to Production. Running npx prisma db push...');

    const cmd = `cd ${APP_PATH} && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `npx prisma db push --accept-data-loss && ` +
        `/www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('Finished with code ' + code);
            conn.end();
        });
        stream.on('data', data => process.stdout.write(data.toString()));
        stream.stderr.on('data', data => process.stderr.write(data.toString()));
    });
}).connect({
    host: '124.158.9.5',
    username: 'incall',
    password: 'P@ssw0rdVu'
});
