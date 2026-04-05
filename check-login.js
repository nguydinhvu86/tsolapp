const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && ls -la app/portal/login`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => conn.end()).on('data', (d) => process.stdout.write(d.toString())).stderr.on('data', (d) => process.stderr.write(d.toString()));
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password });
