const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected!');
    conn.exec(`curl -s http://127.0.0.1:3000/uploads/avatars/$(ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/avatars/ | grep -E '\\.(png|jpg|jpeg)$' | head -n 1) > /tmp/curl-test.html && head -c 500 /tmp/curl-test.html`, (err, stream) => {
        let out = '';
        stream.on('data', data => out += data.toString())
              .on('close', () => {
                  console.log(out);
                  conn.end();
              });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
