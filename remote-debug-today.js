const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find leads converted today
        const leads = await prisma.lead.findMany({
            where: {
                status: 'WON',
                updatedAt: { gte: today }
            },
            include: {
                customer: {
                    include: { managers: { select: { name: true } } }
                }
            }
        });
        
        console.log("Leads converted/updated today:", leads.length);
        for (const l of leads) {
            console.log("----");
            console.log("Lead Name:", l.name);
            console.log("Lead Code:", l.code);
            if (l.customer) {
                console.log("Customer Id:", l.customer.id);
                console.log("Customer Name:", l.customer.name);
                console.log("Customer Managers:", l.customer.managers.map(m=>m.name).join(', '));
            } else {
                console.log("Customer: NULL (Not converted properly?)");
            }
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
        `cat << 'EOF' > debug-today.js\n${scriptContent}\nEOF\n` +
        `node debug-today.js`;

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
