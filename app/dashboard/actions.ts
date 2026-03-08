'use server';

import { prisma } from '@/lib/prisma';
import { Quote, Contract, Handover, PaymentRequest, ContractAppendix, Dispatch } from '@prisma/client';

export async function getDashboardStats(userId?: string, employeeId?: string) {
    try {
        const [
            estimates,
            contracts,
            handovers,
            payments,
            appendices,
            dispatches,
            customers,
            myTasks,
            purchaseOrders,
            salesInvoices
        ] = await Promise.all([
            prisma.salesEstimate.findMany({
                select: { id: true, status: true, validUntil: true, date: true, createdAt: true, customer: { select: { name: true } }, code: true, totalAmount: true },
                where: employeeId ? { OR: [{ creatorId: employeeId }, { salespersonId: employeeId }] } : {},
                orderBy: { createdAt: 'desc' },
                take: 500
            }),
            prisma.contract.findMany({ select: { id: true, status: true, createdAt: true, customer: { select: { name: true } }, title: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
            prisma.handover.findMany({ select: { id: true, status: true, createdAt: true, customer: { select: { name: true } }, title: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
            prisma.paymentRequest.findMany({ select: { id: true, status: true, createdAt: true, customer: { select: { name: true } }, title: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
            prisma.contractAppendix.findMany({ select: { id: true, status: true, createdAt: true, contract: { select: { title: true } }, title: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
            prisma.dispatch.findMany({ select: { id: true, status: true, createdAt: true, customer: { select: { name: true } }, title: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
            prisma.customer.findMany({ select: { id: true, name: true, createdAt: true, taxCode: true, phone: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
            userId ? prisma.task.findMany({ where: { OR: [{ assignees: { some: { userId: userId } } }, { creatorId: userId }], status: { not: 'COMPLETED' } }, orderBy: { dueDate: 'asc' }, take: 10, select: { id: true, title: true, dueDate: true, priority: true } }) : Promise.resolve([]),
            prisma.purchaseOrder.findMany({ select: { id: true, status: true, totalAmount: true, createdAt: true, supplier: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 500 }),
            prisma.salesInvoice.findMany({
                select: { id: true, status: true, totalAmount: true, paidAmount: true, createdAt: true, date: true, dueDate: true, code: true, customer: { select: { name: true } } },
                where: employeeId ? { OR: [{ creatorId: employeeId }, { salespersonId: employeeId }] } : {},
                orderBy: { createdAt: 'desc' },
                take: 1000
            })
        ]);

        // Financial Aggregations
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        // Cash Flow Aggregation (Current Year)
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

        const [
            allSalesPayments,
            allPurchasePayments,
            allExpenses
        ] = await Promise.all([
            prisma.salesPayment.findMany({
                where: {
                    date: { gte: startOfYear, lte: endOfYear },
                    ...(employeeId ? {
                        allocations: {
                            some: {
                                invoice: {
                                    OR: [
                                        { creatorId: employeeId },
                                        { salespersonId: employeeId }
                                    ]
                                }
                            }
                        }
                    } : {})
                },
                select: { amount: true, date: true }
            }),
            prisma.purchasePayment.findMany({
                where: { date: { gte: startOfYear, lte: endOfYear } },
                select: { amount: true, date: true }
            }),
            prisma.expense.findMany({
                where: {
                    status: { notIn: ['DRAFT', 'CANCELLED'] },
                    date: { gte: startOfYear, lte: endOfYear }
                },
                select: { amount: true, date: true }
            })
        ]);

        const cashFlow = Array.from({ length: 12 }, (_, i) => ({
            name: `T${i + 1}`,
            income: 0,
            expense: 0,
            supplierPayment: 0
        }));

        allSalesPayments.forEach(p => {
            if (p.date) {
                const month = new Date(p.date).getMonth();
                cashFlow[month].income += p.amount || 0;
            }
        });

        allPurchasePayments.forEach(p => {
            if (p.date) {
                const month = new Date(p.date).getMonth();
                cashFlow[month].supplierPayment += p.amount || 0;
            }
        });

        allExpenses.forEach(e => {
            if (e.date) {
                const month = new Date(e.date).getMonth();
                cashFlow[month].expense += e.amount || 0;
            }
        });

        // 1. Phân tích Mua Hàng (Purchase Orders)
        let totalPurchaseParams = { total: 0, thisMonth: 0, lastMonth: 0 };
        purchaseOrders.forEach(po => {
            if (po.status !== 'CANCELLED') {
                const poDate = new Date(po.createdAt);
                totalPurchaseParams.total += po.totalAmount || 0;
                if (poDate.getFullYear() === currentYear) {
                    if (poDate.getMonth() === currentMonth) totalPurchaseParams.thisMonth += po.totalAmount || 0;
                    if (poDate.getMonth() === currentMonth - 1) totalPurchaseParams.lastMonth += po.totalAmount || 0;
                }
            }
        });

        // 2. Phân tích Công Nợ / Hóa Đơn (Sales Invoices)
        let invoiceParams = {
            totalRevenue: 0,
            totalDebt: 0,
            thisMonthRevenue: 0,
            lastMonthRevenue: 0
        };
        salesInvoices.forEach(inv => {
            if (inv.status !== 'DRAFT' && inv.status !== 'CANCELLED') {
                const invDate = new Date(inv.date || inv.createdAt);

                // Revenue
                invoiceParams.totalRevenue += (inv.totalAmount || 0);
                if (invDate.getFullYear() === currentYear) {
                    if (invDate.getMonth() === currentMonth) invoiceParams.thisMonthRevenue += (inv.totalAmount || 0);
                    if (invDate.getMonth() === currentMonth - 1) invoiceParams.lastMonthRevenue += (inv.totalAmount || 0);
                }

                // Debt = Total - Paid
                const debt = (inv.totalAmount || 0) - (inv.paidAmount || 0);
                if (debt > 0) {
                    invoiceParams.totalDebt += debt;
                }
            }
        });

        return {
            totalQuotes: estimates.length,
            acceptedQuotes: estimates.filter(q => q.status === 'ACCEPTED').length,
            totalContracts: contracts.length,
            signedContracts: contracts.filter(c => c.status === 'SIGNED').length,
            financialMetrics: {
                purchase: totalPurchaseParams,
                invoices: invoiceParams,
                cashFlow: cashFlow // Pass cash flow data to client
            },
            // Pass raw arrays for client-side chart processing if needed, 
            // but usually we aggregate on server. For this scale, passing lightweight arrays is okay.
            recentActivity: {
                quotes: estimates.slice(0, 100),
                contracts: contracts.slice(0, 100),
                handovers: handovers.slice(0, 100),
                payments: payments.slice(0, 100),
                appendices: appendices.slice(0, 100),
                dispatches: dispatches.slice(0, 100)
            },
            recentCustomers: customers,
            myTasks: myTasks,
            recentPurchaseOrders: purchaseOrders,
            recentQuotes: estimates.slice(0, 10), // Specifically for the quotes list widget
            chartDataSources: {
                quotes: estimates,
                contracts: contracts,
                invoices: salesInvoices
            }
        };
    } catch (e) {
        console.error("Dashboard stats error", e);
        return null;
    }
}

export async function getDashboardConfig(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { dashboardConfig: true }
        });
        return user?.dashboardConfig || "[]";
    } catch (e) {
        console.error("Get dashboard config error", e);
        return "[]";
    }
}

export async function saveDashboardConfig(userId: string, configJson: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { dashboardConfig: configJson }
        });
        return { success: true };
    } catch (e) {
        console.error("Save dashboard config error", e);
        return { success: false, error: "Failed to save configuration" };
    }
}

export async function updateDashboardTaskStatus(taskId: string, status: string) {
    try {
        const { getServerSession } = await import('next-auth');
        const { authOptions } = await import('@/lib/authOptions');
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

        const { updateTaskStatus } = await import('@/app/tasks/actions');
        await updateTaskStatus(taskId, status, session.user.id);

        const { revalidatePath } = await import('next/cache');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (e: any) {
        console.error("Failed to update task from dashboard:", e);
        return { success: false, error: e.message };
    }
}
