const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    let count = 0;
    try {
        const orphans = await prisma.customer.findMany({
            where: {
                managers: { none: {} },
                activityLogs: { none: {} }
            },
            include: {
                leads: true
            }
        });
        
        console.log("Remote Orphan Customers found:", orphans.length);
        
        for (const c of orphans) {
            if (c.leads && c.leads.length > 0) {
                const lead = c.leads[0];
                const userId = lead.assignedToId || lead.creatorId;
                if (userId) {
                    await prisma.customer.update({
                        where: { id: c.id },
                        data: { managers: { connect: [{ id: userId }] } }
                    });
                    await prisma.customerActivityLog.create({
                        data: {
                            customerId: c.id,
                            userId: userId,
                            action: "ĐỒNG_BỘ",
                            details: "Tự động đồng bộ quyền (Orphan)"
                        }
                    });
                    count++;
                    console.log("Fixed " + c.name + " using Lead owner: " + userId);
                } else {
                    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
                    if (admin) {
                        await prisma.customer.update({
                            where: { id: c.id },
                            data: { managers: { connect: [{ id: admin.id }] } }
                        });
                        await prisma.customerActivityLog.create({
                            data: {
                                customerId: c.id,
                                userId: admin.id,
                                action: "ĐỒNG_BỘ",
                                details: "Tự động đồng bộ cấp quyền ADMIN (Orphan)"
                            }
                        });
                        count++;
                        console.log("Fixed " + c.name + " (Admin)");
                    }
                }
            } else {
                 const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
                 if (admin) {
                    await prisma.customer.update({
                        where: { id: c.id },
                        data: { managers: { connect: [{ id: admin.id }] } }
                    });
                     await prisma.customerActivityLog.create({
                            data: {
                                customerId: c.id,
                                userId: admin.id,
                                action: "ĐỒNG_BỘ",
                                details: "Tự động đồng bộ (Orphan, No Leads)"
                            }
                    });
                    count++;
                 }
            }
        }
    } catch(e) {
        console.error("Error connecting to DB:", e.message);
    }
    console.log("Total orphans fixed on production:", count);
}
check().catch(console.error).finally(() => process.exit(0));
`;

conn.on('ready', () => {
    // Write and execute
    const deployCmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `cat << 'EOF' > fix-orphans-remote.js\n${scriptContent}\nEOF\n` +
        `node fix-orphans-remote.js`;

    conn.exec(deployCmd, (err, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', (code) => {
            console.log("\nRemote fix finished.");
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
