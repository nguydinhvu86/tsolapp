const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected! Checking route file...');
    conn.exec(`cat /www/wwwroot/inside.tsol.vn/tsolapp/app/uploads/\\[...path\\]/route.ts | grep uploads_data`, (err, stream) => {
        let out = '';
        stream.on('data', data => out += data.toString())
              .on('close', () => {
                  console.log(out);
                  // Also let's check pm2 logs for errors!
                  conn.exec(`pm2 logs tsolapp --lines 20 --nostream`, (e, s) => {
                      let r = '';
                      s.on('data', d => r += d.toString())
                       .on('close', () => {
                          console.log('PM2 LOGS:\n' + r);
                          conn.end();
                       });
                  });
              });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
