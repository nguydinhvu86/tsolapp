const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    const cmdLS = `ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/avatars/ | grep -E '\\.(png|jpg|jpeg)$' | head -n 1`;
    conn.exec(cmdLS, (err, stream) => {
        let file = '';
        stream.on('data', data => file += data.toString())
              .on('close', () => {
                  file = file.trim();
                  console.log('Testing file:', file);
                  conn.exec(`curl -i -s http://127.0.0.1:3000/uploads/avatars/${file} | head -n 1`, (e, s) => {
                      let r = '';
                      s.on('data', d => r += d.toString())
                       .on('close', () => {
                          console.log('CURL HEADER:\n' + r);
                          conn.end();
                       });
                  });
              });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
