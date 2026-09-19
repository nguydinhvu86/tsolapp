const { Client } = require('ssh2');
const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `
export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH

echo "=== 1. Find cmmeznb1y000j13xsyb1gfust across the entire /www ==="
find /www/ -name "*cmmeznb1y000j13xsyb1gfust*" 2>/dev/null || true

echo "=== 2. Check /www/wwwroot/ins.tsol.com.vn/uploads ==="
ls -la /www/wwwroot/ins.tsol.com.vn/uploads 2>/dev/null | head -n 20 || true

echo "=== 3. Search for files containing cmmeznb1y000j13xsyb1gfust in database ==="
cd /www/wwwroot/inside.tsol.vn/tsolapp
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function find() {
    const tasks = await p.taskAttachment.findMany({ where: { fileUrl: { contains: 'cmmeznb1y' } } });
    console.log('TaskAttachments found:', tasks);
    const users = await p.user.findMany({ where: { avatar: { contains: 'cmmdibfp0000041p926ag2j47' } } });
    console.log('User avatar found:', users.map(u => ({ id: u.id, name: u.name, avatar: u.avatar })));
}
find().finally(() => p.\\$disconnect());
"
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
