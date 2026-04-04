const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    // find customers with no managers and no activity logs
    const orphans = await prisma.customer.findMany({
        where: {
            managers: { none: {} },
            activityLogs: { none: {} }
        },
        include: {
            leads: true
        }
    });

    console.log("Orphan Customers found:", orphans.length);
    for (const c of orphans) {
        console.log(`- ${c.name} | leads linked: ${c.leads?.length}`);
    }

    // Now fix them
    let count = 0;
    for (const c of orphans) {
        if (c.leads.length > 0) {
            const lead = c.leads[0];
            const userId = lead.assignedToId || lead.creatorId;
            if (userId) {
                await prisma.customer.update({
                    where: { id: c.id },
                    data: {
                        managers: { connect: [{ id: userId }] }
                    }
                });
                
                await prisma.customerActivityLog.create({
                    data: {
                        customerId: c.id,
                        userId: userId,
                        action: "ĐỒNG_BỘ",
                        details: "Tự động đồng bộ quyền Truy Cập (Orphan)"
                    }
                });
                count++;
                console.log(`Fixed ${c.name} using Lead ${lead.code} owner: ${userId}`);
            } else {
                // If the lead has no creator or assignedTo, just assign them to the first admin
                const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
                if (admin) {
                     await prisma.customer.update({
                        where: { id: c.id },
                        data: {
                            managers: { connect: [{ id: admin.id }] }
                        }
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
                    console.log(`Fixed ${c.name} (Assigned to global root admin)`);
                }
            }
        }
    }
    console.log("Total fixed:", count);
}

check().catch(console.error).finally(() => process.exit(0));
