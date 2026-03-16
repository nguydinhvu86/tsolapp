const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const password = 'P@ssw0rdVu';

conn.on('ready', () => {
    const scriptBody = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const result = await prisma.$queryRawUnsafe('SELECT migration_name, started_at, finished_at, rolled_back_at, logs FROM _prisma_migrations ORDER BY started_at DESC LIMIT 1');
        console.log(JSON.stringify(result, null, 2));
    } catch(e) {
        console.error(e);
    }
}
main().finally(() => prisma.$disconnect());
    `;

    const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && cat << 'EOF' > get_error_prod.js
${scriptBody}
EOF
node get_error_prod.js && rm get_error_prod.js`;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            console.log('done writing JSON to prod_error_logs.json');
            conn.end();
        }).on('data', (data) => {
            fs.appendFileSync('prod_error_logs.json', data.toString());
        }).stderr.on('data', (data) => {
            fs.appendFileSync('prod_error_logs.json', data.toString());
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: password
});
