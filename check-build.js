const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('Checking build-log.txt...');
    conn.exec(`tail -n 150 /www/wwwroot/inside.tsol.vn/tsolapp/build-log.txt`, (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('close', (code, signal) => {
            require('fs').writeFileSync('local-build-log.txt', dataStr);
            console.log('Saved log locally');
            conn.end();
        }).on('data', (data) => dataStr += data.toString());
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
