const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    // get tail of pm2 error log
    conn.exec(`tail -n 100 /root/.pm2/logs/tsolapp-error.log`, (err, stream) => {
        let out = '';
        stream.on('data', data => out += data.toString())
              .on('close', () => {
                  console.log(out);
                  conn.end();
              });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
