const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
    let output = '';
    conn.exec('echo "P@ssw0rdVu" | sudo -S tail -n 50 /www/wwwlogs/inside.tsol.vn.error.log', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            fs.writeFileSync('nginx_error.log', output);
            console.log('Saved to nginx_error.log');
            conn.end();
        })
        .on('data', data => output += data.toString())
        .stderr.on('data', data => {});
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
