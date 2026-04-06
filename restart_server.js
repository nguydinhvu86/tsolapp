const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && pm2 restart inside.tsol.vn', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('PM2 restart exit code:', code);
            conn.end();
            process.exit(code);
        }).on('data', (data) => process.stdout.write(data))
          .stderr.on('data', (data) => process.stderr.write(data));
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
