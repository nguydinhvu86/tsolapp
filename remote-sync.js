const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected! Pulling from git and restarting pm2...');
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && git reset --hard && git pull origin main && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npm run build && /www/server/nodejs/v14.17.6/bin/pm2 restart inside.tsol.vn`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        
        stream.on('data', data => process.stdout.write(data.toString()))
              .stderr.on('data', data => process.stderr.write(data.toString()))
              .on('close', (code) => {
                  console.log('Close code:', code);
                  conn.end();
              });
    });
}).on('error', err => console.error(err))
  .connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
