const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
    conn.exec('tail -n 250 /root/.pm2/logs/inside.tsol.vn-error.log', (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('data', data => dataStr += data.toString());
        stream.on('close', () => {
            require('fs').writeFileSync('tmp-pm2-error.log', dataStr);
            console.log('Saved 250 lines to tmp-pm2-error.log');
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
