const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const project = await prisma.project.findUnique({
            where: { id: "cmnv4d1l50003g6n4kik4tjh5" }, // Dummy ID
            include: {
                creator: { select: { id: true, name: true, avatar: true } },
                members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                comments: {
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { id: true, name: true, avatar: true } }, reactions: true }
                },
                attachments: { include: { uploadedBy: { select: { id: true, name: true } } } },
                customer: { select: { id: true, name: true, phone: true, email: true } },
                contract: { select: { id: true, title: true, status: true, createdAt: true } },
                quote: { select: { id: true, title: true, status: true, createdAt: true } },
                salesEstimate: { select: { id: true, code: true, status: true, totalAmount: true, date: true } },
                salesOrder: { select: { id: true, code: true, status: true, totalAmount: true, date: true } },
                invoice: { select: { id: true, code: true, status: true, totalAmount: true, paidAmount: true, date: true } },
                purchaseOrders: { select: { id: true, code: true, status: true, totalAmount: true, date: true, supplier: { select: { name: true } } } },
                purchaseBills: { select: { id: true, code: true, status: true, totalAmount: true, paidAmount: true, date: true, supplier: { select: { name: true } } } },
                purchasePayments: { select: { id: true, code: true, amount: true, date: true, supplier: { select: { name: true } } } },
                expenses: { select: { id: true, code: true, status: true, amount: true, date: true, description: true } },
                tasks: {
                    include: {
                        assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                        creator: { select: { id: true, name: true } },
                        observers: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                        checklists: {
                            orderBy: { createdAt: 'asc' },
                            include: { completedBy: { select: { id: true, name: true } } }
                        },
                        comments: {
                            orderBy: { createdAt: 'desc' },
                            include: { user: { select: { id: true, name: true, avatar: true } } }
                        },
                        attachments: { include: { uploadedBy: { select: { id: true, name: true } } } },
                        activityLogs: {
                            orderBy: { createdAt: 'desc' },
                            include: { user: { select: { id: true, name: true } } }
                        },
                        customer: { select: { id: true, name: true } },
                        contract: { select: { id: true, title: true } },
                        quote: { select: { id: true, title: true } },
                        handover: { select: { id: true, title: true } },
                        paymentReq: { select: { id: true, title: true } },
                        dispatch: { select: { id: true, title: true } },
                        dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true, dueDate: true } } } }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        console.log("SUCCESS!", project ? "Found project" : "Project not found, but query is valid!");
    } catch (err) {
        console.error("PRISMA ERROR:\n", err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
