const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    // 1. Get Nginx extensions
    const cmd1 = `echo '${password}' | sudo -S cat /www/server/panel/vhost/nginx/extension/inside.tsol.vn/*.conf`;

    // 2. Also let's tail pm2 logs again if we can find pm2 in .nvm or /www/server/nvm
    const cmd2 = `echo '${password}' | sudo -S /www/server/nvm/versions/node/v20*/bin/pm2 logs --lines 100 --nostream`;

    // 3. And get exactly the Nginx log lines for 404 and POST
    const cmd3 = `echo '${password}' | sudo -S grep " 404 " /www/wwwlogs/inside.tsol.vn.log | tail -n 20`;

    conn.exec(`${cmd1}; echo "---"; ${cmd2}; echo "---"; ${cmd3}`, (err, stream) => {
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
