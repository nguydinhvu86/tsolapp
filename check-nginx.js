const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `cat /www/server/panel/vhost/nginx/inside.tsol.vn.conf`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (d) => process.stdout.write(d.toString())).stderr.on('data', (d) => process.stderr.write(d.toString()));
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password });
