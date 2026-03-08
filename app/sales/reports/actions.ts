'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function getSalesReportData(employeeId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { customers: [], invoices: [], payments: [], expenses: [], estimates: [] };

    const isAdminOrManager = session.user.role === 'ADMIN' || session.user.role === 'MANAGER';
    let effectiveEmployeeId: string | undefined = undefined;

    if (!isAdminOrManager) {
        effectiveEmployeeId = session.user.id;
    } else if (employeeId) {
        effectiveEmployeeId = employeeId;
    }

    const today = new Date();
    // Default to fetch data for the current year to avoid massive payload right away
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

    const salesFilter = effectiveEmployeeId ? {
        OR: [
            { creatorId: effectiveEmployeeId },
            { salespersonId: effectiveEmployeeId }
        ]
    } : {};

    const paymentFilter = effectiveEmployeeId ? {
        allocations: {
            some: {
                invoice: {
                    OR: [
                        { creatorId: effectiveEmployeeId },
                        { salespersonId: effectiveEmployeeId }
                    ]
                }
            }
        }
    } : {};

    // Fetch Customers
    const customers = await prisma.customer.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            taxCode: true,
            totalDebt: true
        }
    });

    // Fetch Invoices
    const invoices = await prisma.salesInvoice.findMany({
        where: {
            date: { gte: firstDayOfYear },
            status: { notIn: ['DRAFT', 'CANCELLED'] },
            ...salesFilter
        },
        include: {
            customer: true,
            items: {
                include: { product: true }
            }
        },
        orderBy: { date: 'desc' }
    });

    // Fetch Payments
    const payments = await prisma.salesPayment.findMany({
        where: {
            date: { gte: firstDayOfYear },
            ...paymentFilter
        },
        include: {
            customer: true,
            allocations: true
        },
        orderBy: { date: 'desc' }
    });

    // Fetch Expenses - Expenses are company wide, but if we need to filter them by creator:
    const expenseFilter = effectiveEmployeeId ? { creatorId: effectiveEmployeeId } : {};

    const expenses = await prisma.expense.findMany({
        where: {
            date: { gte: firstDayOfYear },
            ...expenseFilter
        },
        include: {
            category: true,
            customer: true,
            supplier: true
        },
        orderBy: { date: 'desc' }
    });

    // Fetch Estimates
    const estimates = await prisma.salesEstimate.findMany({
        where: {
            date: { gte: firstDayOfYear },
            ...salesFilter
        },
        include: {
            customer: true
        },
        orderBy: { date: 'desc' }
    });

    return { customers, invoices, payments, expenses, estimates };
}
