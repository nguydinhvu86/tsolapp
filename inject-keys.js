const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

const publicVapidKey = 'BKJsmvBgUYQII4AcNtsdIGoONbT-x39d9Q-sP9gY0a8fD0OIfIInz3uK8t8m9A-N_6cFI_V7XDvSNNtVfAp0R1Uc';
const privateVapidKey = 'iVwqOoU9-nq7TAaQRJ7E6B-1h-K2N5qVv5Z3FzN1_qM';
const envAdditions = `

# Web Push VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY="${publicVapidKey}"
VAPID_PRIVATE_KEY="${privateVapidKey}"
VAPID_SUBJECT="mailto:admin@tsol.vn"
`;

conn.on('ready', () => {
    console.log('Connected to server. Injecting VAPID keys into .env and rebuilding...');

    // Replace or append if it doesn't exist
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
        `sed -i '/VAPID/d' .env && ` +
        `echo '${envAdditions}' >> .env && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `npm run build && ` +
        `/www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        stream.on('close', (code, signal) => {
            console.log('Stream close code: ' + code);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
