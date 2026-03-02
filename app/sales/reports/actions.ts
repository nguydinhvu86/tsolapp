'use server'

import { prisma } from '@/lib/prisma';

export async function getSalesReportData() {
    const today = new Date();
    // Default to fetch data for the current year to avoid massive payload right away
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

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
            date: { gte: firstDayOfYear }
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
            date: { gte: firstDayOfYear }
        },
        include: {
            customer: true,
            allocations: true
        },
        orderBy: { date: 'desc' }
    });

    // Fetch Orders
    const orders = await prisma.salesOrder.findMany({
        where: {
            date: { gte: firstDayOfYear }
        },
        include: {
            customer: true
        },
        orderBy: { date: 'desc' }
    });

    return { customers, invoices, payments, orders };
}
