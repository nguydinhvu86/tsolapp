const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    conn.exec('export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && cd /www/wwwroot/inside.tsol.vn/tsolapp && npm run build', (err, stream) => {
        if (err) throw err;
        let output = '';
        stream.on('close', (code) => {
            require('fs').writeFileSync('remote_build_log.txt', output);
            console.log('Saved to remote_build_log.txt. Exit code:', code);
            conn.end();
            process.exit(code);
        }).on('data', (data) => {
            output += data.toString();
        }).stderr.on('data', (data) => {
            output += data.toString();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
