const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
    conn.exec('ls -la /root/.pm2/logs/', (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('data', data => dataStr += data.toString());
        stream.on('close', () => {
            require('fs').writeFileSync('tmp-pm2-list.log', dataStr);
            console.log('Saved log list to tmp-pm2-list.log');
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
