const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('find /www/wwwroot/inside.tsol.vn/tsolapp/app/portal -name "page.tsx"', (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('data', data => { dataStr += data; });
        stream.on('close', () => {
            console.log(dataStr);
            conn.end();
        });
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
