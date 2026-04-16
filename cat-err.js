const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
    conn.exec('cat /www/wwwroot/inside.tsol.vn/tsolapp/err.log', (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('data', data => dataStr += data.toString());
        stream.on('close', () => {
            console.log(dataStr);
            conn.end();
            process.exit(0);
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
