const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected!');
    conn.exec(`ls -ld /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data || true`, (err, stream) => {
        let out = '';
        stream.on('data', data => out += data.toString())
              .on('close', () => {
                  console.log(out);
                  conn.end();
              });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
