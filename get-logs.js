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
    const cmd = `cat /www/wwwroot/inside.tsol.vn/tsolapp/public/test-webhook.txt | tail -n 20 && echo "---" && cat /www/wwwroot/inside.tsol.vn/tsolapp/public/route-log.txt | tail -n 20`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', d => { output += d; });
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', () => {
            conn.end();
            require('fs').writeFileSync('remote-webhook-logs-2.txt', output);
            console.log("Saved remote webhook logs.");
        });
    });
}).connect(config);
