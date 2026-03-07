const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    // 1. Get raw nginx access log lines that contain 404 and upload
    const cmd1 = `echo '${password}' | sudo -S awk '($9 == 404) && /upload/' /www/wwwlogs/inside.tsol.vn.log | tail -n 10`;

    // 2. Get the Nginx config for this site to see if AAPanel is intercepting /api or /uploads
    const cmd2 = `echo '${password}' | sudo -S cat /www/server/panel/vhost/nginx/inside.tsol.vn.conf`;

    conn.exec(`${cmd1}; echo "---NGINX CONFIG---"; ${cmd2}`, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('close', () => {
            console.log(output);
            conn.end();
        }).on('data', (data) => {
            output += data.toString();
        }).stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
