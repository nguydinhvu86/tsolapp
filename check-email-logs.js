const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && /www/server/nodejs/v14.17.6/bin/npx prisma studio --port 5555`;
    // Instead of prisma studio, let's just use a quick node script to query the DB directly
    const script = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, subject: true, trackingId: true, status: true, toEmail: true, body: true }
  });
  console.log(JSON.stringify(logs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
`;

    conn.exec(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', (data) => { out += data.toString(); });
        stream.stderr.on('data', (data) => { console.error("stderr:", data.toString()); });
        stream.on('close', (code) => {
            console.log("\nLatest Email Logs:\n", out);
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
