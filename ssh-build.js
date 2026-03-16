const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Connected to server. Executing npm run build...');

    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ` +
        `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `npm run build > build-log.txt 2>&1`;

    console.log('Executing:', cmd);
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;

        stream.on('close', (code, signal) => {
            console.log('\nStream :: close :: code: ' + code);

            // Now fetch the log file
            console.log('Fetching build-log.txt...');
            conn.exec(`cat /www/wwwroot/inside.tsol.vn/tsolapp/build-log.txt`, (err2, stream2) => {
                if (err2) throw err2;
                let logData = '';
                stream2.on('close', () => {
                    const fs = require('fs');
                    fs.writeFileSync('build-log.txt', logData);
                    console.log('Saved to build-log.txt locally.');
                    conn.end();
                }).on('data', data => logData += data.toString());
            });

        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
