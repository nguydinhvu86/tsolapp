import { Client } from 'ssh2';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = new Client();
const script = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const logs = await prisma.callLog.findMany({
        where: { phone: { contains: '0989646861' } },
        orderBy: { startedAt: 'desc' },
        take: 10
    });
    console.log(JSON.stringify(logs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
    conn.exec(`cd /www/wwwroot/inside.tsol.vn && cat << 'EOF' > query-db.js\n${script}\nEOF\n/root/.nvm/versions/node/v20.18.3/bin/node query-db.js`, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
        }).on('data', (data) => {
            console.log(data.toString());
        }).stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}).on('error', (err) => {
    console.error('SSH Error', err);
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'root',
    password: process.env.SSH_PASSWORD
});
