const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    // We execute bash -lc to get the interactive environment where pm2 is known
    const cmd = `/www/server/nvm/versions/node/v24.14.0/bin/pm2 restart contract-app && /www/server/nvm/versions/node/v24.14.0/bin/pm2 list`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        stream.on('data', (data) => {
            process.stdout.write(data.toString());
        });

        stream.stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });

        stream.on('close', (code) => {
            console.log(`\nPM2 Restart finished with code ${code}`);
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
