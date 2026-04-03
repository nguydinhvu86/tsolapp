const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncConvertedCustomers() {
    console.log("Starting retroactive sync of Lead -> Customer managers...");
    
    // Find all leads that have a customerId (meaning they were converted or linked)
    const convertedLeads = await prisma.lead.findMany({
        where: { customerId: { not: null } },
        include: { assignees: true }
    });
    
    console.log(`Found ${convertedLeads.length} leads linked to customers.`);
    
    let updatedCount = 0;

    for (const lead of convertedLeads) {
        if (!lead.customerId) continue;
        
        try {
            // Find the customer to see if they already have managers
            const customer = await prisma.customer.findUnique({
                where: { id: lead.customerId },
                include: { managers: true }
            });
            
            if (!customer) continue;
            
            const existingManagerIds = customer.managers.map(m => m.id);
            const newManagerIds = [];
            
            // Add assignedToId
            if (lead.assignedToId && !existingManagerIds.includes(lead.assignedToId)) {
                newManagerIds.push({ id: lead.assignedToId });
            }
            
            // Add creatorId if exists
            if (lead.creatorId && !existingManagerIds.includes(lead.creatorId) && !newManagerIds.find(n => n.id === lead.creatorId)) {
                newManagerIds.push({ id: lead.creatorId });
            }
            
            // Add assignees
            if (lead.assignees) {
                for (const a of lead.assignees) {
                    if (!existingManagerIds.includes(a.userId) && !newManagerIds.find(n => n.id === a.userId)) {
                        newManagerIds.push({ id: a.userId });
                    }
                }
            }
            
            if (newManagerIds.length > 0) {
                await prisma.customer.update({
                    where: { id: lead.customerId },
                    data: {
                        managers: {
                            connect: newManagerIds
                        }
                    }
                });
                
                // Also create an activity log if none exists to ensure double safety
                const logs = await prisma.customerActivityLog.findMany({
                    where: { customerId: lead.customerId }
                });
                
                if (logs.length === 0) {
                    // Just use the first available manager as the logger
                    const userId = newManagerIds[0]?.id || existingManagerIds[0] || (await prisma.user.findFirst()).id;
                    await prisma.customerActivityLog.create({
                        data: {
                            customerId: lead.customerId,
                            userId: userId,
                            action: "ĐỒNG_BỘ_QUYỀN",
                            details: `Đồng bộ quyền truy cập từ Cơ hội: ${lead.code}`
                        }
                    });
                }
                
                console.log(`Synced managers for Customer ${customer.name} (from Lead ${lead.code})`);
                updatedCount++;
            }
        } catch (e) {
            console.error(`Error syncing customer ${lead.customerId}:`, e.message);
        }
    }
    
    console.log(`Done! Synchronized rights for ${updatedCount} customers.`);
    process.exit(0);
}

syncConvertedCustomers().catch(console.error);
