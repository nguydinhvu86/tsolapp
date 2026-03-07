const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Rebuilding app with Node v20...');

    // Prepend Node v20 to PATH instead of appending it.
    const cmd = `source ~/.bashrc; source ~/.profile 2>/dev/null; cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nodejs/v20.18.3/bin:$PATH && node -v && npm run build && pm2 restart next-app`;

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
