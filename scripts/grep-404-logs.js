const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH
echo "${password}" | sudo -S grep " 404 " /www/wwwlogs/inside.tsol.vn.log | tail -n 50
`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.pipe(process.stdout);
        stream.stderr.pipe(process.stderr);
        stream.on('close', () => {
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
