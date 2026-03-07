const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const scriptPath = '/www/wwwroot/inside.tsol.vn/tsolapp/verify-email-log.js';

    // Export .env variables then run
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export $(grep -v '^#' .env | xargs) && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node verify-email-log.js`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', (data) => { out += data.toString(); });
        stream.stderr.on('data', (data) => { console.error("stderr:", data.toString()); });
        stream.on('close', (code) => {
            console.log("\nLatest Email Logs Execution:\n", out);
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
