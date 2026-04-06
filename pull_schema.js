const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if (err) throw err;
        sftp.fastGet('/www/wwwroot/inside.tsol.vn/tsolapp/prisma/schema.prisma', 'schema.prisma.remote', (err) => {
            if (err) throw err;
            console.log('Pulled schema.prisma.remote');
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
