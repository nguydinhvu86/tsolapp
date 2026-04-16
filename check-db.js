const { Client } = require('ssh2');
const conn = new Client();

const APP_PATH = '/www/wwwroot/inside.tsol.vn/tsolapp';

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const est = await prisma.$queryRaw\`DESCRIBE SalesEstimate;\`;
        console.log("SalesEstimate Columns:");
        est.forEach(col => { if(col.Field === 'templateType') console.log("=> templateType EXISTS!"); });
        
        const item = await prisma.$queryRaw\`DESCRIBE SalesEstimateItem;\`
        console.log("SalesEstimateItem Columns:");
        item.forEach(col => { 
            if(['laborPrice', 'origin', 'warranty', 'imageUrl'].includes(col.Field)) {
                console.log("=> " + col.Field + " EXISTS!");
            }
        });
    } catch(e) {
        console.error("DB Error:", e.message);
    }
}
check().catch(console.error).finally(() => process.exit(0));
`;

conn.on('ready', () => {
    const deployCmd = `cd ${APP_PATH} && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `cat << 'EOF' > check-db.js\n${scriptContent}\nEOF\n` +
        `node check-db.js`;

    conn.exec(deployCmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', () => { conn.end(); process.exit(0); });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
