const { Client } = require('ssh2');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const scriptBody = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        console.log("Dropping foreign key constraint for parentId...");
        await prisma.$executeRawUnsafe('ALTER TABLE LeadComment DROP FOREIGN KEY LeadComment_parentId_fkey');
    } catch(e) {
        console.log("FK might not exist:", e.message);
    }
    
    try {
        console.log("Dropping leftover column parentId from LeadComment...");
        await prisma.$executeRawUnsafe('ALTER TABLE LeadComment DROP COLUMN parentId');
        console.log("Column dropped safely.");
    } catch(e) {
        console.error("Column might already be gone:", e.message);
    }
}
main().finally(() => prisma.$disconnect());
    `;

    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && npx prisma migrate resolve --rolled-back 20260315150610_add_lead_notes && cat << 'EOF' > fix_db_prod.js
${scriptBody}
EOF
node fix_db_prod.js && rm fix_db_prod.js`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('done fixing database.');
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
