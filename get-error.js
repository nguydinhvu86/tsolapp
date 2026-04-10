const { Client } = require('ssh2');

const conn = new Client();
const config = {
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
};

conn.on('ready', () => {
    // Check webhook logs
    const cmd = `cat ~/.pm2/logs/inside-tsol-vn-error.log | tail -n 50`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', d => { output += d; });
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => {
            conn.end();
            require('fs').writeFileSync('pm2-route-logs.txt', output);
            console.log("Saved pm2 logs.");
        });
    });
}).connect(config);
