const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    // We will use sudo sed to replace the alias path
    const cmd = `echo "P@ssw0rdVu" | sudo -S sed -i 's|alias /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/;|alias /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/;|g' /www/server/panel/vhost/nginx/inside.tsol.vn.conf && echo "P@ssw0rdVu" | sudo -S systemctl reload nginx`;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log("NGINX Reloaded successfully.");
            conn.end()
        })
        .on('data', data => process.stdout.write(data))
        .stderr.on('data', data => process.stderr.write(data));
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
