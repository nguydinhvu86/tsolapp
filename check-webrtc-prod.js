const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('ls -la /www/wwwroot/inside.tsol.vn/tsolapp/app/components/Softphone && cat /www/wwwroot/inside.tsol.vn/tsolapp/app/components/Softphone/WebRTCDialer.tsx | head -n 15', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            conn.end();
        }).on('data', (data) => {
            console.log(data.toString());
        }).stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
