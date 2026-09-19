const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    console.log('SSH connected. Diagnosing 404 and uploads...');
    const cmd = `
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH

echo "=== 1. Check latest Nginx Access logs for 404 ==="
echo "${password}" | sudo -S tail -n 40 /www/wwwlogs/inside.tsol.vn.log | grep -E " (404|500) " || echo "${password}" | sudo -S tail -n 25 /www/wwwlogs/inside.tsol.vn.log

echo "=== 2. Check Nginx configuration ==="
echo "${password}" | sudo -S cat /www/server/panel/vhost/nginx/inside.tsol.vn.conf | grep -A 8 -B 2 "location.*uploads" || true

echo "=== 3. Check PM2 logs for 404 ==="
pm2 logs contract-app --lines 30 --nostream
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
