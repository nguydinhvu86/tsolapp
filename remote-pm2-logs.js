const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if(err) throw err;
        sftp.fastGet('/www/wwwroot/inside.tsol.vn/tsolapp/public/test-webhook.txt', './webhook-out.txt', (err) => {
            if(err) console.error(err);
            else console.log('DOWNLOADED');
            conn.end(); process.exit(0);
        });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
