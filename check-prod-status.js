const { Client } = require('ssh2');
const https = require('https');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `
cd /www/wwwroot/inside.tsol.vn/tsolapp
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH
node scripts/safe-apply-db.js
`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.pipe(process.stdout);
        stream.stderr.pipe(process.stderr);
        stream.on('close', () => {
            conn.end();
            // Check HTTPS endpoint
            https.get('https://inside.tsol.vn/login', (res) => {
                console.log(`🌐 HTTPS inside.tsol.vn/login Status Code: ${res.statusCode} ${res.statusMessage}`);
            }).on('error', (e) => {
                console.error('HTTP Error:', e.message);
            });
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
