const { Client } = require('ssh2');

const conn = new Client();
const config = {
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
};

conn.on('ready', () => {
    const cmd = `tail -n 10 /www/wwwroot/inside.tsol.vn/tsolapp/public/route-log.txt`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('data', d => { output += d; });
        stream.on('close', () => {
            conn.end();
            require('fs').writeFileSync('tmp-log.txt', output);
        });
    });
}).connect(config);
