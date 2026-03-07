const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const scriptPath = '/www/wwwroot/inside.tsol.vn/tsolapp/verify-email-log.js';
    const scriptContent = `
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

    conn.exec(`echo '${scriptContent.replace(/'/g, "'\\''")}' > ${scriptPath} && cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node verify-email-log.js`, (err, stream) => {
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
