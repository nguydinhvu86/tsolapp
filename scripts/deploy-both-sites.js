const { Client } = require('ssh2');

const runnerScript = `#!/bin/bash
set -e
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH

echo "========================================================"
echo " 🚀 BẮT ĐẦU TRIỂN KHAI VÁ LỖI CHO 2 HỆ THỐNG"
echo "========================================================"
echo "Node version: $(node -v)"
echo "PM2 version:  $(pm2 -v)"

# --- 1. TRIỂN KHAI INSIDE.TSOL.VN ---
echo ""
echo "========================================================"
echo " [1/2] TRIỂN KHAI INSIDE.TSOL.VN (Port 6688 - contract-app)"
echo "========================================================"
cd /www/wwwroot/inside.tsol.vn/tsolapp

chattr -i .user.ini 2>/dev/null || true
git fetch origin
git checkout -f main
git reset --hard origin/main
chattr +i .user.ini 2>/dev/null || true

echo "Commit mới nhất:"
git log -n 1 --oneline

echo "Prisma generate..."
npx prisma generate

(echo 'P@ssw0rdVu' | sudo -S chown -R incall:incall .next 2>/dev/null || true)
(echo 'P@ssw0rdVu' | sudo -S chmod -R 777 .next 2>/dev/null || true)

echo "Building Next.js..."
npm run build

echo "Reloading PM2 contract-app..."
pm2 reload contract-app || pm2 restart contract-app
sleep 3

echo "Kiểm tra HTTP inside.tsol.vn (port 6688):"
curl -I -s http://127.0.0.1:6688 | head -n 3 || echo "Done curl"
echo "✅ Hoàn tất inside.tsol.vn!"

# --- 2. TRIỂN KHAI ERP.INCALL.VN ---
echo ""
echo "========================================================"
echo " [2/2] TRIỂN KHAI ERP.INCALL.VN (Port 6689 - erp-incall)"
echo "========================================================"
cd /www/wwwroot/erp.incall.vn

chattr -i .user.ini 2>/dev/null || true
git fetch origin
git checkout -f main
git reset --hard origin/main
chattr +i .user.ini 2>/dev/null || true

echo "Commit mới nhất:"
git log -n 1 --oneline

echo "Prisma generate..."
npx prisma generate

(echo 'P@ssw0rdVu' | sudo -S chown -R incall:incall .next 2>/dev/null || true)
(echo 'P@ssw0rdVu' | sudo -S chmod -R 777 .next 2>/dev/null || true)

echo "Building Next.js..."
npm run build

echo "Reloading PM2 erp-incall..."
pm2 reload erp-incall || pm2 restart erp-incall
sleep 3

echo "Kiểm tra HTTP erp.incall.vn (port 6689):"
curl -I -s http://127.0.0.1:6689 | head -n 3 || echo "Done curl"
echo "✅ Hoàn tất erp.incall.vn!"

# --- TỔNG KẾT ---
echo ""
echo "========================================================"
echo " 📊 TRẠNG THÁI TIẾN TRÌNH PM2 HIỆN TẠI"
echo "========================================================"
pm2 list

echo ""
echo "🎉 [HOÀN TẤT] Cả 2 hệ thống inside.tsol.vn và erp.incall.vn đã cập nhật thành công!"
`;

const conn = new Client();
console.log('📡 Đang kết nối SSH tới 124.158.9.5:22...');

conn.on('ready', () => {
    console.log('✅ SSH Kết nối thành công!');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error('❌ SFTP error:', err);
            conn.end();
            process.exit(1);
        }

        const remotePath = '/home/incall/deploy_patch_runner.sh';
        const writeStream = sftp.createWriteStream(remotePath, { mode: 0o755 });

        writeStream.on('close', () => {
            console.log('✅ Đã tạo runner script tại /home/incall/deploy_patch_runner.sh!');
            conn.exec('bash /home/incall/deploy_patch_runner.sh', (err, stream) => {
                if (err) {
                    console.error('❌ Lỗi thực thi script:', err);
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
