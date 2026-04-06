const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
    // Grep the 15 lines after "[CALL_IN] Incoming PBX Webhook:" to see the full logged object
    conn.exec('grep -h -A 15 "\\[CALL_IN\\] Incoming PBX Webhook" /home/incall/.pm2/logs/*.log | tail -n 50', (err, stream) => {
        stream.on('data', data => process.stdout.write(data.toString()));
        stream.on('close', () => conn.end());
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
