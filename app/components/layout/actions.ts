'use server';

import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { buildViewFilter } from '@/lib/permissions';

export type SearchResult = {
    id: string;
    type: 'CUSTOMER' | 'SUPPLIER' | 'SALES_ESTIMATE' | 'SALES_ORDER' | 'SALES_INVOICE' | 'PURCHASE_ORDER' | 'PURCHASE_BILL' | 'QUOTE' | 'CONTRACT' | 'TASK';
    title: string;
    subtitle?: string;
    badge?: string;
    link: string;
    date?: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) return [];
    const search = query.trim();
    if (search.length < 2) return [];

    const session = await getServerSession(authOptions);
    if (!session || !session.user) return [];

    const results: SearchResult[] = [];
    const limit = 5;
    const userId = session.user.id;
    const perms = (session.user.permissions as string[]) || [];

    try {
        const custFilter = buildViewFilter(userId, perms, 'CUSTOMERS', 'creatorId');
        if (custFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const customers = await prisma.customer.findMany({
                where: {
                    AND: [
                        custFilter,
                        {
                            OR: [
                                { name: { contains: search } },
                                { phone: { contains: search } },
                                { email: { contains: search } },
                                { taxCode: { contains: search } },
                                { notes: { some: { content: { contains: search } } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: { id: true, name: true, phone: true }
            });
            customers.forEach((c: any) => results.push({ id: c.id, type: 'CUSTOMER', title: c.name, subtitle: c.phone || 'Khách hàng', link: `/customers/${c.id}` }));
        }

        const suppFilter = buildViewFilter(userId, perms, 'SUPPLIERS', 'creatorId');
        if (suppFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const suppliers = await prisma.supplier.findMany({
                where: { AND: [suppFilter, { OR: [{ name: { contains: search } }, { code: { contains: search } }, { phone: { contains: search } }] }] } as any,
                take: limit, select: { id: true, name: true, code: true, phone: true }
            });
            suppliers.forEach((s: any) => results.push({ id: s.id, type: 'SUPPLIER', title: s.name, subtitle: `${s.code} ${s.phone ? '- ' + s.phone : ''}`, link: `/suppliers/${s.id}` }));
        }

        const estFilter = buildViewFilter(userId, perms, 'SALES_ESTIMATES', 'creatorId');
        if (estFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const estimates = await prisma.salesEstimate.findMany({
                where: {
                    AND: [
                        estFilter,
                        {
                            OR: [
                                { code: { contains: search } },
                                { notes: { contains: search } },
                                { tags: { contains: search } },
                                { customer: { name: { contains: search } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: { id: true, code: true, date: true, status: true, customer: { select: { name: true } } }
            });
            estimates.forEach((e: any) => results.push({ id: e.id, type: 'SALES_ESTIMATE', title: `BG (ERP): ${e.code}`, subtitle: e.customer.name, badge: e.status, date: e.date.toISOString(), link: `/sales/estimates/${e.id}` }));
        }

        const orderFilter = buildViewFilter(userId, perms, 'SALES_ORDERS', 'creatorId');
        if (orderFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const orders = await prisma.salesOrder.findMany({
                where: {
                    AND: [
                        orderFilter,
                        {
                            OR: [
                                { code: { contains: search } },
                                { notes: { contains: search } },
                                { customer: { name: { contains: search } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: { id: true, code: true, date: true, status: true, customer: { select: { name: true } } }
            });
            orders.forEach((o: any) => results.push({ id: o.id, type: 'SALES_ORDER', title: `Đơn Hàng: ${o.code}`, subtitle: o.customer.name, badge: o.status, date: o.date.toISOString(), link: `/sales/orders/${o.id}` }));
        }

        const invFilter = buildViewFilter(userId, perms, 'SALES_INVOICES', 'creatorId');
        if (invFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const invoices = await prisma.salesInvoice.findMany({
                where: {
                    AND: [
                        invFilter,
                        {
                            OR: [
                                { code: { contains: search } },
                                { notes: { contains: search } },
                                { tags: { contains: search } },
                                { customer: { name: { contains: search } } },
                                { invoiceNotes: { some: { content: { contains: search } } } },
                            ]
                        }
                    ]
                } as any,
                take: limit, select: { id: true, code: true, date: true, status: true, customer: { select: { name: true } } }
            });
            invoices.forEach((i: any) => results.push({ id: i.id, type: 'SALES_INVOICE', title: `HĐ Bán: ${i.code}`, subtitle: i.customer.name, badge: i.status, date: i.date.toISOString(), link: `/sales/invoices/${i.id}` }));
        }

        const qFilter = buildViewFilter(userId, perms, 'QUOTES', 'creatorId');
        if (qFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const quotes = await prisma.quote.findMany({
                where: {
                    AND: [
                        qFilter,
                        {
                            OR: [
                                { title: { contains: search } },
                                { content: { contains: search } },
                                { customer: { name: { contains: search } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: { id: true, title: true, status: true, customer: { select: { name: true } }, createdAt: true }
            });
            quotes.forEach((q: any) => results.push({ id: q.id, type: 'QUOTE', title: q.title, subtitle: q.customer.name, badge: q.status, date: q.createdAt.toISOString(), link: `/quotes/${q.id}` }));
        }

        const cFilter = buildViewFilter(userId, perms, 'CONTRACTS', 'creatorId');
        if (cFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const contracts = await prisma.contract.findMany({
                where: {
                    AND: [
                        cFilter,
                        {
                            OR: [
                                { title: { contains: search } },
                                { content: { contains: search } },
                                { customer: { name: { contains: search } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: { id: true, title: true, status: true, customer: { select: { name: true } }, createdAt: true }
            });
            contracts.forEach((c: any) => results.push({ id: c.id, type: 'CONTRACT', title: c.title, subtitle: c.customer.name, badge: c.status, date: c.createdAt.toISOString(), link: `/contracts/${c.id}` }));
        }

        const taskFilter = buildViewFilter(userId, perms, 'TASKS', 'creatorId');
        if (taskFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const tasks = await prisma.task.findMany({
                where: {
                    AND: [
                        {
                            OR: [
                                { creatorId: userId },
                                { assignees: { some: { userId } } },
                                { observers: { some: { userId } } }
                            ]
                        },
                        {
                            OR: [
                                { title: { contains: search } },
                                { description: { contains: search } },
                                { checklists: { some: { title: { contains: search } } } },
                                { comments: { some: { content: { contains: search } } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: { id: true, title: true, status: true, priority: true, dueDate: true }
            });
            tasks.forEach((t: any) => results.push({ id: t.id, type: 'TASK', title: t.title, subtitle: `Ưu tiên: ${t.priority}`, badge: t.status, date: t.dueDate?.toISOString(), link: `/tasks/${t.id}` }));
        }

        return results;
    } catch (e) {
        console.error("Search Error:", e);
        return [];
    }
}

export async function getLayoutSettings() {
    noStore();
    try {
        const settings = await prisma.systemSetting.findMany({
            where: { key: { in: ['COMPANY_DISPLAY_NAME', 'COMPANY_NAME', 'COMPANY_LOGO'] } }
        });

        const settingsMap: Record<string, string> = {};
        settings.forEach(s => settingsMap[s.key] = s.value);

        return {
            name: settingsMap['COMPANY_DISPLAY_NAME'] || settingsMap['COMPANY_NAME'] || 'ContractMgr',
            logo: settingsMap['COMPANY_LOGO'] || null
        };
    } catch (error) {
        return { name: 'ContractMgr', logo: null };
    }
}

export async function getSidebarOrder(): Promise<string[]> {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return [];

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { sidebarOrder: true }
        });
        if (user && user.sidebarOrder) {
            return JSON.parse(user.sidebarOrder);
        }
    } catch (e) {
        console.error("Failed to fetch sidebar order", e);
    }
    return [];
}

export async function updateSidebarOrder(order: string[]) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return;

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { sidebarOrder: JSON.stringify(order) }
        });
    } catch (e) {
        console.error("Failed to update sidebar order", e);
    }
}
