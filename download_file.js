const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        sftp.fastGet('/tmp/comments.json', './comments_from_prod.json', (err) => {
            if(err) console.error(err);
            else console.log('Downloaded comments_from_prod.json successfully')
            conn.end();
        });
    });
}).connect({host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu'});
