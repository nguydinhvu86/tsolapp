const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec(`grep "/uploads/" /www/wwwroot/inside.tsol.vn/tsolapp/.next/server/app-paths-manifest.json`, (err, stream) => {
        let out = '';
        stream.on('data', data => out += data.toString())
              .on('close', () => {
                  console.log('App Paths:', out);
                  conn.end();
              });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
