const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const matches = await prisma.customer.findMany({
            where: {
                name: { contains: "khánh" }
            },
            include: {
                managers: { select: { id: true, name: true, role: true } },
                leads: { select: { id: true, code: true } }
            }
        });
        
        console.log("Found matches exactly:", matches.length);
        for (const m of matches) {
            console.log("Customer:", m.name, "- ID:", m.id);
            console.log(" - Linked Leads:", m.leads.length);
            console.log(" - Managers:", m.managers.map(u => u.name + " (" + u.role + ")").join(", "));
        }
    } catch(e) {
        console.error("Error:", e.message);
    }
}
check().catch(console.error).finally(() => process.exit(0));
`;

conn.on('ready', () => {
    // Write and execute
    const deployCmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `cat << 'EOF' > debug-user-kh.js\n${scriptContent}\nEOF\n` +
        `node debug-user-kh.js`;

    conn.exec(deployCmd, (err, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', (code) => {
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
