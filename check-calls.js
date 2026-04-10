const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();
conn.on('ready', () => {
    const s = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const calls = await prisma.callLog.findMany({
    where: { phone: { endsWith: '989425246' } },
    orderBy: { startedAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(calls, null, 2));
}
main().finally(() => prisma.$disconnect());
`;
    conn.exec(`echo "${s.replace(/"/g, '\\"')}" > /www/wwwroot/inside.tsol.vn/tsolapp/test-calls.js && cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && node test-calls.js`, (err, stream) => {
        stream.on('data', d => process.stdout.write(d));
        stream.on('close', () => conn.end());
    });
}).connect({ host: '124.158.9.5', port: 22, username: 'incall', password: 'P@ssw0rdVu' });
