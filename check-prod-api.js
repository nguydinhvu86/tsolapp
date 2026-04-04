const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected! Checking app/api/files remotely...');
    const cmdLS = `ls -la /www/wwwroot/inside.tsol.vn/tsolapp/app/api/files || echo "MISSING"`;
    conn.exec(cmdLS, (err, stream) => {
        let out = '';
        stream.on('data', data => out += data.toString())
              .on('close', () => {
                  console.log(out);
                  conn.end();
              });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
