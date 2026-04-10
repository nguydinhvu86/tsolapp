const { Client } = require('ssh2');
const conn = new Client();

const script = `
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
    const logs = await prisma.callLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25
    });
    console.log(JSON.stringify(logs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
    conn.exec(`cd /www/wwwroot/inside.tsol.vn/tsolapp && cat << 'EOF' > query-db.js\n${script}\nEOF\nexport PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node query-db.js`, (err, stream) => {
        if (err) throw err;
        let dataStr = '';
        stream.on('close', (code) => {
            conn.end();
            const fs = require('fs');
            fs.writeFileSync('db-trace.json', dataStr, 'utf8');
            process.exit(code);
        }).on('data', (data) => {
            dataStr += data.toString();
        }).stderr.on('data', (data) => {
            // ignore stderr
        });
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
