const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH

echo "=== 1. Find file cmmeznb1y000j13xsyb1gfust-1775098195636.pdf ==="
find /www/wwwroot/inside.tsol.vn/ -name "*cmmeznb1y000j13xsyb1gfust-1775098195636*" || true

echo "=== 2. Find file cmmdibfp0000041p926ag2j47-1772857856092.png ==="
find /www/wwwroot/inside.tsol.vn/ -name "*cmmdibfp0000041p926ag2j47-1772857856092*" || true

echo "=== 3. List all files in /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/ ==="
ls -R /www/wwwroot/inside.tsol.vn/tsolapp/uploads_data/ | head -n 30

echo "=== 4. List all files in /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/ ==="
ls -R /www/wwwroot/inside.tsol.vn/tsolapp/public/uploads/ | head -n 30
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
