const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH

echo "=== 1. Find all uploads / avatar / document folders on server ==="
find /www/wwwroot/ -type d -name "uploads*" 2>/dev/null || true
find /www/wwwroot/ -type d -name "documents" 2>/dev/null || true
find /www/wwwroot/ -type d -name "avatars" 2>/dev/null || true

echo "=== 2. Check total files in public/uploads and uploads_data ==="
echo "Files in uploads_data/documents: $(ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/documents/ | wc -l)"
echo "Files in uploads_data/avatars: $(ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/avatars/ | wc -l)"
echo "Files in public/uploads/documents: $(ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/documents/ | wc -l)"
echo "Files in public/uploads/avatars: $(ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/avatars/ | wc -l)"

echo "=== 3. Đồng bộ gộp 2 chiều (Merge) giữa public/uploads và uploads_data để không sót bất kỳ file nào ==="
cp -rn /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/* /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/ 2>/dev/null || true
cp -rn /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/* /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/ 2>/dev/null || true

echo "=== 4. Phân quyền lại toàn bộ thư mục uploads cho www và incall ==="
echo "${password}" | sudo -S chmod -R 777 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data
echo "${password}" | sudo -S chmod -R 777 /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads

echo "=== 5. Sau khi gộp ==="
echo "Files in uploads_data/documents: $(ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/documents/ | wc -l)"
echo "Files in public/uploads/documents: $(ls -1 /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/documents/ | wc -l)"
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
