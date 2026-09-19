const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH

echo "=== 1. Find all files for user cmmeznb1y in uploads_data/documents ==="
ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/documents/ | grep cmmeznb1y | head -n 30 || echo "Not found in uploads_data/documents"

echo "=== 2. Search entire root filesystem / for this file or similar ==="
find / -name "*1775098195636*" 2>/dev/null || true
find / -name "*1772857856092*" 2>/dev/null || true

echo "=== 3. Check /www/backup or /www/server or /home ==="
find /home/ -type f 2>/dev/null | head -n 20 || true
find /www/backup/ -type f 2>/dev/null | head -n 20 || true
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
