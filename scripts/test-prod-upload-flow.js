const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH

echo "=== 1. Test creating a sample file directly in uploads_data/documents and testing HTTP ==="
TEST_FILE="test-upload-verify-$(date +%s).txt"
echo "TSOL Enterprise File Upload Verification OK" > /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/documents/$TEST_FILE
cp /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/documents/$TEST_FILE /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/documents/$TEST_FILE

echo "=== 2. Test GET via /uploads/documents/$TEST_FILE ==="
curl -I -s "https://inside.tsol.vn/uploads/documents/$TEST_FILE" -k

echo "=== 3. Test GET via /api/files/documents/$TEST_FILE ==="
curl -I -s "https://inside.tsol.vn/api/files/documents/$TEST_FILE" -k

echo "=== 4. Fix folder permissions 777 ==="
echo "${password}" | sudo -S chmod -R 777 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data
echo "${password}" | sudo -S chmod -R 777 /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads

echo "=== 5. Test clean up test file ==="
rm -f /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/documents/$TEST_FILE
rm -f /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/documents/$TEST_FILE
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
