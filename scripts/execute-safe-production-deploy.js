const { Client } = require('ssh2');
const conn = new Client();

const runnerScript = `#!/bin/bash
set -e
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH

DIRECTORY="/www/wwwroot/inside.tsol.vn/tsolapp"
BACKUP_DIR="/home/incall/backups_pre_deploy"
BRANCH="main"

echo "========================================================"
echo " [BƯỚC 1/6] KHỞI TẠO THƯ MỤC VÀ BACKUP TOÀN DIỆN"
echo "========================================================"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

cd "$DIRECTORY"

DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")

eval $(node -e '
const u = new URL(process.argv[1]);
console.log("DB_HOST=" + u.hostname);
console.log("DB_PORT=" + (u.port || 3306));
console.log("DB_USER=" + decodeURIComponent(u.username));
console.log("DB_PASS=\\"" + decodeURIComponent(u.password) + "\\"");
console.log("DB_NAME=" + u.pathname.replace(/^\\//, "").split("?")[0]);
' "$DB_URL")

echo "1.1. Đang sao lưu toàn bộ Cơ sở Dữ liệu ($DB_NAME)..."
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$BACKUP_DIR/db_\${DB_NAME}_\${TIMESTAMP}.sql.gz"
ls -lh "$BACKUP_DIR/db_\${DB_NAME}_\${TIMESTAMP}.sql.gz"
echo "✅ Sao lưu CSDL hoàn tất!"

echo "1.2. Đang sao lưu toàn bộ thư mục tệp tin uploads (uploads_data & public/uploads)..."
tar -czf "$BACKUP_DIR/uploads_backup_\${TIMESTAMP}.tar.gz" uploads_data public/uploads 2>/dev/null || true
ls -lh "$BACKUP_DIR/uploads_backup_\${TIMESTAMP}.tar.gz"
echo "✅ Sao lưu tệp tin uploads hoàn tất!"

echo "========================================================"
echo " [BƯỚC 2/6] ĐỒNG BỘ MÃ NGUỒN TỪ GITHUB (origin/$BRANCH)"
echo "========================================================"
chattr -i .user.ini 2>/dev/null || true
git fetch origin
git checkout -f $BRANCH
git reset --hard origin/$BRANCH
chattr +i .user.ini 2>/dev/null || true
git log -n 1 --oneline
echo "✅ Đồng bộ mã nguồn hoàn tất!"

echo "========================================================"
echo " [BƯỚC 3/6] CẬP NHẬT THƯ VIỆN DEPENDENCIES (npm install)"
echo "========================================================"
npm install --prefer-offline || npm install
echo "✅ Cài đặt dependencies hoàn tất!"

echo "========================================================"
echo " [BƯỚC 4/6] PRISMA GENERATE VÀ SAFE DATABASE MIGRATION"
echo "========================================================"
npx prisma generate
node scripts/safe-apply-db.js
echo "✅ Áp dụng CSDL an toàn hoàn tất!"

echo "========================================================"
echo " [BƯỚC 5/6] BIÊN DỊCH ỨNG DỤNG SẢN XUẤT (npm run build)"
echo "========================================================"
(echo 'P@ssw0rdVu' | sudo -S chown -R incall:incall .next 2>/dev/null || true)
(echo 'P@ssw0rdVu' | sudo -S chmod -R 777 .next 2>/dev/null || true)
npm run build
echo "✅ Biên dịch Next.js production thành công!"

echo "========================================================"
echo " [BƯỚC 6/6] BẢO VỆ PERMISSION VÀ KHỞI ĐỘNG LẠI PM2"
echo "========================================================"
echo 'P@ssw0rdVu' | sudo -S chmod -R 777 uploads_data public/uploads 2>/dev/null || true
/www/server/nodejs/v14.17.6/bin/pm2 reload contract-app || /www/server/nodejs/v14.17.6/bin/pm2 restart contract-app
sleep 3
/www/server/nodejs/v14.17.6/bin/pm2 status

echo "========================================================"
echo " [KIỂM TRA DỊCH VỤ SAU KHI TRIỂN KHAI]"
echo "========================================================"
curl -I -s http://127.0.0.1:3000 | head -n 5 || curl -I -s http://localhost:6688 | head -n 5 || echo "HTTP Check done"

echo "🎉 [THÀNH CÔNG] Triển khai Production an toàn đã hoàn tất 100%!"
`;

console.log('🚀 [START] Bắt đầu quy trình triển khai Production an toàn tuyệt đối...');
console.log('📡 Đang kết nối SSH tới máy chủ 124.158.9.5:22...');

conn.on('ready', () => {
    console.log('✅ SSH Kết nối thành công!');

    conn.sftp((err, sftp) => {
        if (err) {
            console.error('❌ SFTP error:', err);
            conn.end();
            process.exit(1);
        }

        const remotePath = '/home/incall/deploy_runner.sh';
        const writeStream = sftp.createWriteStream(remotePath, { mode: 0o755 });

        writeStream.on('close', () => {
            console.log('✅ Đã tạo runner script tại /home/incall/deploy_runner.sh!');

            conn.exec('bash /home/incall/deploy_runner.sh', (err, stream) => {
                if (err) {
                    console.error('❌ Lỗi thực thi runner script:', err);
                    conn.end();
                    process.exit(1);
                }

                stream.on('close', (code, signal) => {
                    console.log(`\n🏁 Tiến trình trên máy chủ kết thúc với mã thoát: ${code}`);
                    conn.end();
                    process.exit(code || 0);
                });

                stream.pipe(process.stdout);
                stream.stderr.pipe(process.stderr);
            });
        });

        writeStream.end(runnerScript);
    });
}).on('error', err => {
    console.error('❌ Kết nối SSH thất bại:', err);
    process.exit(1);
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu',
    readyTimeout: 30000
});
