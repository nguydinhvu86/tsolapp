const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    // Curl via external DNS since Nginx is patched, or via port 6688
    const cmdLS = `ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/avatars/ | grep -E '\\.(png|jpg|jpeg)$' | head -n 1`;
    conn.exec(cmdLS, (err, stream) => {
        let file = '';
        stream.on('data', data => file += data.toString())
              .on('close', () => {
                  file = file.trim();
                  console.log('Testing file via NGINX (HTTPS):', file);
                  conn.exec(`curl -i -s https://inside.tsol.vn/uploads/avatars/${file} | head -n 15`, (e, s) => {
                      let r = '';
                      s.on('data', d => r += d.toString())
                       .on('close', () => {
                          console.log('NGINX FULL OUTPUT:\n' + r);
                          conn.end();
                       });
                  });
              });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
