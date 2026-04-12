const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('ls -la /home/incall/.pm2/logs/ && tail -n 250 /home/incall/.pm2/logs/*.log', (err, stream) => {
        let output = '';
        stream.on('data', d => output += d);
        stream.stderr.on('data', d => output += d);
        stream.on('close', () => {
            require('fs').writeFileSync('tmp-pm2-incall.log', output);
            console.log('Saved to tmp-pm2-incall.log');
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
