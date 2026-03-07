const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('SFTP :: session started');
        const readStream = fs.createReadStream('p1sql.sql');
        const writeStream = sftp.createWriteStream('/www/wwwroot/inside.tsol.vn/tsolapp/p1sql.sql');

        writeStream.on('close', () => {
            console.log("- file transferred successfully");
            conn.end();
        });

        writeStream.on('error', (err) => {
            console.error("Write Error:", err);
            conn.end();
        });

        readStream.pipe(writeStream);
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
