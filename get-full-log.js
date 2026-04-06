const fs = require('fs');
const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('tail -n 200 /home/incall/.pm2/logs/inside.tsol.vn-out.log /home/incall/.pm2/logs/inside.tsol.vn-error.log', (err, stream) => {
        let output = '';
        stream.on('data', data => { output += data.toString(); });
        stream.on('close', () => {
            fs.writeFileSync('./call-in-logs.txt', output);
            console.log('Logs written to call-in-logs.txt');
            conn.end();
        });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
