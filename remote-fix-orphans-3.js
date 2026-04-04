const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    let count = 0;
    try {
        const customersFromLeads = await prisma.customer.findMany({
            where: {
                leads: { some: {} }
            },
            include: {
                managers: true,
                leads: {
                    include: {
                        activityLogs: {
                            where: { action: "CHUYỂN_ĐỔI" }
                        }
                    }
                }
            }
        });
        
        console.log("Customers linked to Leads found:", customersFromLeads.length);
        
        for (const c of customersFromLeads) {
            let neededManagerIds = [];
            const existingManagerIds = c.managers.map(m => m.id);
            
            for (const lead of c.leads) {
                for (const log of lead.activityLogs) {
                    if (log.userId && !existingManagerIds.includes(log.userId)) {
                        neededManagerIds.push(log.userId);
                    }
                }
            }
            
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
                        details: "Tự động đồng bộ quyền cho người thực hiện thao tác Chuyển Đổi"
                    }
                });
                count++;
                console.log("Fixed " + c.name + " by adding Converter users: " + neededManagerIds.join(', '));
            }
        }
    } catch(e) {
        console.error("Error connecting to DB:", e.message);
    }
    console.log("Total specifically synced user conversions on production:", count);
}
check().catch(console.error).finally(() => process.exit(0));
`;

conn.on('ready', () => {
    // Write and execute
    const deployCmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && ` +
        `cat << 'EOF' > fix-orphans-remote-3.js\n${scriptContent}\nEOF\n` +
        `node fix-orphans-remote-3.js`;

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
