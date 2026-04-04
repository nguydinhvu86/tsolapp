const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected! Fixing Nginx config...');
    // The path to nginx config for this site is usually /www/server/panel/vhost/nginx/inside.tsol.vn.conf
    const cmd = `
        sed -i 's/location \\^\\~ \\/uploads\\//location \\^\\~ \\/uploads_DISABLED\\//g' /www/server/panel/vhost/nginx/inside.tsol.vn.conf && \\
        nginx -s reload
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('Nginx reloaded.');
            conn.end();
        });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
