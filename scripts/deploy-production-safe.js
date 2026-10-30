const { Client } = require('ssh2');

const runnerScript = `#!/bin/bash
set -e
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
GLOBAL_BACKUP_DIR="/home/incall/backups_deploy_$TIMESTAMP"
mkdir -p "$GLOBAL_BACKUP_DIR"

echo "========================================================"
echo " 🛡️ BẮT ĐẦU QUY TRÌNH TRIỂN KHAI PRODUCTION AN TOÀN TUYỆT ĐỐI"
echo " Thư mục sao lưu: $GLOBAL_BACKUP_DIR"
echo " Thời điểm: $(date)"
echo "========================================================"

# ========================================================
# [PHẦN 1/2] TRIỂN KHAI INSIDE.TSOL.VN (contract-app : Port 6688)
# ========================================================
echo ""
echo "========================================================"
echo " 🌐 [1/2] XỬ LÝ SITE: INSIDE.TSOL.VN"
echo "========================================================"
cd /www/wwwroot/inside.tsol.vn/tsolapp

# 1.1 Sao lưu CSDL & Uploads của inside.tsol.vn
echo "--- [1.1] Sao lưu Cơ sở dữ liệu & Tệp tin tải lên (inside.tsol.vn) ---"
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
eval $(node -e '
const u = new URL(process.argv[1]);
console.log("DB_HOST=" + u.hostname);
console.log("DB_PORT=" + (u.port || 3306));
console.log("DB_USER=" + decodeURIComponent(u.username));
console.log("DB_PASS=\\"" + decodeURIComponent(u.password) + "\\"");
console.log("DB_NAME=" + u.pathname.replace(/^\\//, "").split("?")[0]);
' "$DB_URL")

mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$GLOBAL_BACKUP_DIR/inside_db_\${DB_NAME}.sql.gz"
echo "✅ Đã sao lưu database inside: $(ls -lh $GLOBAL_BACKUP_DIR/inside_db_\${DB_NAME}.sql.gz | awk '{print $5}')"

tar -czf "$GLOBAL_BACKUP_DIR/inside_uploads.tar.gz" uploads_data public/uploads 2>/dev/null || true
echo "✅ Đã sao lưu uploads inside: $(ls -lh $GLOBAL_BACKUP_DIR/inside_uploads.tar.gz | awk '{print $5}')"

# 1.2 Đồng bộ mã nguồn Git
echo "--- [1.2] Đồng bộ mã nguồn từ GitHub ---"
chattr -i .user.ini 2>/dev/null || true
git fetch origin
git checkout -f main
git reset --hard origin/main
chattr +i .user.ini 2>/dev/null || true
echo "Commit mới nhất:"
git log -n 1 --oneline

# 1.3 Prisma Generate & Cập nhật CSDL an toàn (Không làm mất dữ liệu)
echo "--- [1.3] Cập nhật Prisma & Áp dụng Schema an toàn ---"
npx prisma generate
node scripts/safe-apply-db.js

# 1.4 Biên dịch Next.js Production
echo "--- [1.4] Biên dịch Next.js (npm run build) ---"
(echo 'P@ssw0rdVu' | sudo -S chown -R incall:incall .next 2>/dev/null || true)
(echo 'P@ssw0rdVu' | sudo -S chmod -R 777 .next 2>/dev/null || true)
npm run build

# 1.5 Reload PM2
echo "--- [1.5] Reload PM2 contract-app ---"
(echo 'P@ssw0rdVu' | sudo -S chmod -R 777 uploads_data public/uploads 2>/dev/null || true)
pm2 reload contract-app || pm2 restart contract-app
sleep 3

echo "--- [1.6] Kiểm tra HTTP bên trong (Port 6688) ---"
curl -I -s http://127.0.0.1:6688 | head -n 4 || echo "Curl checked"
echo "✅ HOÀN TẤT TRIỂN KHAI INSIDE.TSOL.VN!"


# ========================================================
# [PHẦN 2/2] TRIỂN KHAI ERP.INCALL.VN (erp-incall : Port 6689)
# ========================================================
echo ""
echo "========================================================"
echo " 🌐 [2/2] XỬ LÝ SITE: ERP.INCALL.VN"
echo "========================================================"
cd /www/wwwroot/erp.incall.vn

# 2.1 Sao lưu CSDL & Uploads của erp.incall.vn
echo "--- [2.1] Sao lưu Cơ sở dữ liệu & Tệp tin tải lên (erp.incall.vn) ---"
DB_URL_INCALL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
eval $(node -e '
const u = new URL(process.argv[1]);
console.log("DB_HOST=" + u.hostname);
console.log("DB_PORT=" + (u.port || 3306));
console.log("DB_USER=" + decodeURIComponent(u.username));
console.log("DB_PASS=\\"" + decodeURIComponent(u.password) + "\\"");
console.log("DB_NAME=" + u.pathname.replace(/^\\//, "").split("?")[0]);
' "$DB_URL_INCALL")

mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$GLOBAL_BACKUP_DIR/incall_db_\${DB_NAME}.sql.gz"
echo "✅ Đã sao lưu database erp.incall.vn: $(ls -lh $GLOBAL_BACKUP_DIR/incall_db_\${DB_NAME}.sql.gz | awk '{print $5}')"

tar -czf "$GLOBAL_BACKUP_DIR/incall_uploads.tar.gz" uploads_data public/uploads 2>/dev/null || true
echo "✅ Đã sao lưu uploads erp.incall.vn: $(ls -lh $GLOBAL_BACKUP_DIR/incall_uploads.tar.gz | awk '{print $5}')"

# 2.2 Đồng bộ mã nguồn Git
echo "--- [2.2] Đồng bộ mã nguồn từ GitHub ---"
chattr -i .user.ini 2>/dev/null || true
git fetch origin
git checkout -f main
git reset --hard origin/main
chattr +i .user.ini 2>/dev/null || true
echo "Commit mới nhất:"
git log -n 1 --oneline

# 2.3 Prisma Generate & Cập nhật CSDL an toàn
echo "--- [2.3] Cập nhật Prisma & Áp dụng Schema an toàn ---"
npx prisma generate
node scripts/safe-apply-db.js

# 2.4 Biên dịch Next.js Production
echo "--- [2.4] Biên dịch Next.js (npm run build) ---"
(echo 'P@ssw0rdVu' | sudo -S chown -R incall:incall .next 2>/dev/null || true)
(echo 'P@ssw0rdVu' | sudo -S chmod -R 777 .next 2>/dev/null || true)
npm run build

# 2.5 Reload PM2
echo "--- [2.5] Reload PM2 erp-incall ---"
(echo 'P@ssw0rdVu' | sudo -S chmod -R 777 uploads_data public/uploads 2>/dev/null || true)
pm2 reload erp-incall || pm2 restart erp-incall
sleep 3

echo "--- [2.6] Kiểm tra HTTP bên trong (Port 6689) ---"
curl -I -s http://127.0.0.1:6689 | head -n 4 || echo "Curl checked"
echo "✅ HOÀN TẤT TRIỂN KHAI ERP.INCALL.VN!"


# ========================================================
# TỔNG KẾT VÀ BÁO CÁO TRẠNG THÁI
# ========================================================
echo ""
echo "========================================================"
echo " 📊 TRẠNG THÁI TIẾN TRÌNH PM2 HIỆN TẠI TRÊN MÁY CHỦ"
echo "========================================================"
pm2 list

echo ""
echo "📁 DANH SÁCH BẢN SAO LƯU ĐÃ TẠO AN TOÀN TRƯỚC KHI TRIỂN KHAI:"
ls -lh "$GLOBAL_BACKUP_DIR"

echo ""
echo "🎉 [THÀNH CÔNG RỰC RỠ] Cả 2 hệ thống inside.tsol.vn và erp.incall.vn đã cập nhật hoàn tất!"
`;

const conn = new Client();
console.log('📡 Đang kết nối SSH tới máy chủ Production (124.158.9.5:22)...');

conn.on('ready', () => {
    console.log('✅ SSH Kết nối thành công!');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('❌ SFTP error:', err);
            conn.end();
            process.exit(1);
        }

        const remotePath = '/home/incall/deploy_production_safe.sh';
        const writeStream = sftp.createWriteStream(remotePath, { mode: 0o755 });

        writeStream.on('close', () => {
            console.log('✅ Đã tạo runner script tại /home/incall/deploy_production_safe.sh!');
            console.log('🚀 Đang thực thi quá trình sao lưu và triển khai tự động...\n');

            conn.exec('bash /home/incall/deploy_production_safe.sh', (execErr, stream) => {
                if (execErr) {
                    console.error('❌ Lỗi thực thi script:', execErr);
                    conn.end();
                    process.exit(1);
                }

                stream.on('close', (code) => {
                    console.log(`\n🏁 Tiến trình kết thúc với mã thoát: ${code}`);
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
