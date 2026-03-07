const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Executing git checkout and build...');

    // Commands to run natively on the server
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
        `git fetch origin main && ` +
        `git checkout origin/main -- app/components/layout app/components/ui app/globals.css && ` +
        `rm -f lib/utils/cn.ts tailwind.config.ts postcss.config.js tailwind.config.js && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `npm run build && ` +
        `/www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

    console.log('Executing:', cmd);
    conn.exec(cmd, (err, execStream) => {
        if (err) throw err;

        execStream.on('data', (data) => process.stdout.write(data.toString()));
        execStream.stderr.on('data', (data) => process.stderr.write(data.toString()));

        execStream.on('close', (code) => {
            console.log(`\nDeployment finished with code ${code}`);
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
