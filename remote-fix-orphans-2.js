const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    let count = 0;
    try {
        // Find ALL Customers that are linked from Leads
        const customersFromLeads = await prisma.customer.findMany({
            where: {
                leads: { some: {} }
            },
            include: {
                managers: true,
                leads: {
                    include: { assignees: true }
                }
            }
        });
        
        console.log("Customers linked to Leads found:", customersFromLeads.length);
        
        for (const c of customersFromLeads) {
            let neededManagerIds = [];
            const existingManagerIds = c.managers.map(m => m.id);
            
            for (const lead of c.leads) {
                if (lead.assignedToId && !existingManagerIds.includes(lead.assignedToId)) {
                    neededManagerIds.push(lead.assignedToId);
                }
                if (lead.creatorId && !existingManagerIds.includes(lead.creatorId)) {
                    neededManagerIds.push(lead.creatorId);
                }
                if (lead.assignees) {
                    for (const a of lead.assignees) {
                        if (!existingManagerIds.includes(a.userId)) neededManagerIds.push(a.userId);
                    }
                }
            }
            
            // Deduplicate neededManagerIds
            neededManagerIds = [...new Set(neededManagerIds)].filter(id => id);
            
            if (neededManagerIds.length > 0) {
                await prisma.customer.update({
                    where: { id: c.id },
                    data: {
                        managers: {
                            connect: neededManagerIds.map(id => ({ id }))
                        }
                    }
                });
                
                await prisma.customerActivityLog.create({
                    data: {
                        customerId: c.id,
                        userId: neededManagerIds[0],
                        action: "ĐỒNG_BỘ",
                        details: "Tự động đồng bộ quyền (từ Cơ hội bán hàng)"
                    }
                });
                count++;
                console.log("Fixed " + c.name + " with managers: " + neededManagerIds.join(', '));
            } else if (existingManagerIds.length === 0) {
                 // Absolutely no managers AND no managers derived from leads! Default to Admin
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
                            details: "Tự động đồng bộ cấp quyền ADMIN do truy xuất chủ thể mồ côi."
                        }
                    });
                    count++;
                 }
            }
        }
    } catch(e) {
        console.error("Error connecting to DB:", e.message);
    }
    console.log("Total specifically synced on production:", count);
}
check().catch(console.error).finally(() => process.exit(0));
`;

conn.on('ready', () => {
    // Write and execute
    const deployCmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `cat << 'EOF' > fix-orphans-remote-2.js\n${scriptContent}\nEOF\n` +
        `node fix-orphans-remote-2.js`;

    conn.exec(deployCmd, (err, stream) => {
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
        stream.on('close', (code) => {
            console.log("\nRemote explicit fix finished.");
            conn.end();
        });
    });
}).connect({
    host: '124.158.9.5',
    port: 22,
    username: 'incall',
    password: 'P@ssw0rdVu'
});
