const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
    // AAPanel typically uses a specific PM2 binary to list processes and get logs
    const cmd = `export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && /www/server/nodejs/v14.17.6/bin/pm2 logs --err --nostream --lines 200 inside.tsol.vn`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('data', data => dataStr += data.toString());
        stream.stderr.on('data', data => dataStr += data.toString());
        stream.on('close', () => {
            require('fs').writeFileSync('tmp-pm2-real.log', dataStr);
            console.log('Saved pm2 logs to tmp-pm2-real.log');
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
