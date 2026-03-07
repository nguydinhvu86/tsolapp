const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `echo '${password}' | sudo -S cat /www/server/panel/vhost/nginx/inside.tsol.vn.conf`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('close', () => {
            fs.writeFileSync('nginx_backup.conf', out);
            console.log("Saved config to nginx_backup.conf");
            conn.end();
        }).on('data', (data) => {
            out += data.toString();
        }).stderr.on('data', (data) => {
            console.error("stderr:", data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
