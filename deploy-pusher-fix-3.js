const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Rebuilding app with explicit Node v20 path...');

    // Explicitly use the node v20 binary to run the local next CLI
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && /www/server/nodejs/v20.18.3/bin/node node_modules/.bin/next build && export PATH=/www/server/nodejs/v20.18.3/bin:$PATH && pm2 restart next-app`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        stream.on('data', (data) => {
            process.stdout.write(data.toString());
        });

        stream.stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });

        stream.on('close', (code) => {
            console.log(`\nBuild and Restart process finished with code ${code}`);
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
