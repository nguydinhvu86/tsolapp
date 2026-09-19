const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH

echo "=== 1. Tất cả request gần nhất từ IP 1.54.43.184 ==="
echo "${password}" | sudo -S grep "1.54.43.184" /www/wwwlogs/inside.tsol.vn.log | tail -n 30

echo "=== 2. Test file documents trên đĩa ==="
SAMPLE_DOC=$(ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/documents/ | head -n 1)
echo "Sample file: $SAMPLE_DOC"

echo "=== 3. Test qua Next.js /api/files/documents/$SAMPLE_DOC ==="
curl -I -s "http://127.0.0.1:6688/api/files/documents/$SAMPLE_DOC" || true

echo "=== 4. Test qua Next.js /uploads/documents/$SAMPLE_DOC ==="
curl -I -s "http://127.0.0.1:6688/uploads/documents/$SAMPLE_DOC" || true

echo "=== 5. Test qua Nginx /uploads/documents/$SAMPLE_DOC ==="
curl -I -s "https://inside.tsol.vn/uploads/documents/$SAMPLE_DOC" -k || true

echo "=== 6. Test qua Nginx /api/files/documents/$SAMPLE_DOC ==="
curl -I -s "https://inside.tsol.vn/api/files/documents/$SAMPLE_DOC" -k || true
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
