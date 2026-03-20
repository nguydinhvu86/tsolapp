'use server';

import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { buildViewFilter } from '@/lib/permissions';

export type SearchResult = {
    id: string;
    type: 'CUSTOMER' | 'SUPPLIER' | 'SALES_ESTIMATE' | 'SALES_ORDER' | 'SALES_INVOICE' | 'PURCHASE_ORDER' | 'PURCHASE_BILL' | 'QUOTE' | 'CONTRACT' | 'TASK' | 'LEAD';
    title: string;
    subtitle?: string;
    badge?: string;
    link: string;
    date?: string;
};

function getMatchSnippet(text: string | null | undefined, search: string, label: string): string | null {
    if (!text) return null;
    const cleanText = text.replace(/<[^>]+>/g, ' ');
    const lowerText = cleanText.toLowerCase();
    const searchLower = search.toLowerCase();
    const idx = lowerText.indexOf(searchLower);
    if (idx > -1) {
        const start = Math.max(0, idx - 15);
        const snippet = cleanText.substring(start, idx + searchLower.length + 30).replace(/\s+/g, ' ').trim();
        return `Trong ${label}: "...${snippet}..."`;
    }
    return null;
}

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
    const searchLower = search.toLowerCase();

    try {
        let custFilter: any = buildViewFilter(userId, perms, 'CUSTOMERS', 'creatorId');
        if (custFilter.creatorId) {
            custFilter = {
                OR: [
                    { activityLogs: { some: { userId } } },
                    { managers: { some: { id: userId } } },
                    { quotes: { some: { creatorId: userId } } },
                    { contracts: { some: { creatorId: userId } } },
                    { leads: { some: { creatorId: userId } } },
                    { salesInvoices: { some: { OR: [{ creatorId: userId }, { salespersonId: userId }, { managers: { some: { id: userId } } }] } } },
                    { salesEstimates: { some: { OR: [{ creatorId: userId }, { salespersonId: userId }, { managers: { some: { id: userId } } }] } } },
                    { salesOrders: { some: { creatorId: userId } } }
                ]
            };
        }
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
                take: limit, select: {
                    id: true, name: true, phone: true, email: true, taxCode: true,
                    notes: { where: { content: { contains: search } }, take: 1, select: { content: true } }
                }
            });
            customers.forEach((c: any) => {
                let context: string | null = null;
                if (!c.name?.toLowerCase().includes(searchLower) && !c.phone?.toLowerCase().includes(searchLower)) {
                    if (c.email?.toLowerCase().includes(searchLower)) context = `Email: ${c.email}`;
                    else if (c.taxCode?.toLowerCase().includes(searchLower)) context = `MST: ${c.taxCode}`;
                    else if (c.notes?.length > 0) context = getMatchSnippet(c.notes[0].content, search, 'ghi chú');
                }
                const sub = c.phone || 'Khách hàng';
                results.push({ id: c.id, type: 'CUSTOMER', title: c.name, subtitle: context ? `${sub} • ${context}` : sub, link: `/customers/${c.id}` });
            });
        }

        const suppFilter = buildViewFilter(userId, perms, 'SUPPLIERS');
        if (suppFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const suppliers = await prisma.supplier.findMany({
                where: { OR: [{ name: { contains: search } }, { code: { contains: search } }, { phone: { contains: search } }] },
                take: limit, select: { id: true, name: true, code: true, phone: true }
            });
            suppliers.forEach((s: any) => results.push({ id: s.id, type: 'SUPPLIER', title: s.name, subtitle: `${s.code} ${s.phone ? '- ' + s.phone : ''}`, link: `/suppliers/${s.id}` }));
        }

        let estFilter: any = buildViewFilter(userId, perms, 'SALES_ESTIMATES', 'creatorId');
        if (estFilter.creatorId) estFilter = { OR: [{ creatorId: userId }, { salespersonId: userId }, { managers: { some: { id: userId } } }] };
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
                take: limit, select: {
                    id: true, code: true, date: true, status: true, notes: true, tags: true,
                    customer: { select: { name: true } }
                }
            });
            estimates.forEach((e: any) => {
                let context = null;
                if (!e.code?.toLowerCase().includes(searchLower) && !e.customer?.name?.toLowerCase().includes(searchLower)) {
                    context = getMatchSnippet(e.notes, search, 'ghi chú') || getMatchSnippet(e.tags, search, 'thẻ');
                }
                const sub = e.customer?.name || 'Khách lẻ';
                results.push({ id: e.id, type: 'SALES_ESTIMATE', title: `BG (ERP): ${e.code}`, subtitle: context ? `${sub} • ${context}` : sub, badge: e.status, date: e.date.toISOString(), link: `/sales/estimates/${e.id}` });
            });
        }

        let orderFilter: any = buildViewFilter(userId, perms, 'SALES_ORDERS', 'creatorId');
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
                take: limit, select: {
                    id: true, code: true, date: true, status: true, notes: true,
                    customer: { select: { name: true } }
                }
            });
            orders.forEach((o: any) => {
                let context = null;
                if (!o.code?.toLowerCase().includes(searchLower) && !o.customer?.name?.toLowerCase().includes(searchLower)) {
                    context = getMatchSnippet(o.notes, search, 'ghi chú');
                }
                const sub = o.customer?.name || 'Khách lẻ';
                results.push({ id: o.id, type: 'SALES_ORDER', title: `Đơn Hàng: ${o.code}`, subtitle: context ? `${sub} • ${context}` : sub, badge: o.status, date: o.date.toISOString(), link: `/sales/orders/${o.id}` });
            });
        }

        let invFilter: any = buildViewFilter(userId, perms, 'SALES_INVOICES', 'creatorId');
        if (invFilter.creatorId) invFilter = { OR: [{ creatorId: userId }, { salespersonId: userId }, { managers: { some: { id: userId } } }] };
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
                take: limit, select: {
                    id: true, code: true, date: true, status: true, notes: true, tags: true,
                    customer: { select: { name: true } },
                    invoiceNotes: { where: { content: { contains: search } }, take: 1, select: { content: true } }
                }
            });
            invoices.forEach((i: any) => {
                let context = null;
                if (!i.code?.toLowerCase().includes(searchLower) && !i.customer?.name?.toLowerCase().includes(searchLower)) {
                    context = getMatchSnippet(i.notes, search, 'ghi chú') || getMatchSnippet(i.tags, search, 'thẻ');
                    if (!context && i.invoiceNotes?.length > 0) context = getMatchSnippet(i.invoiceNotes[0].content, search, 'ghi chú hóa đơn');
                }
                const sub = i.customer?.name || 'Khách lẻ';
                results.push({ id: i.id, type: 'SALES_INVOICE', title: `HĐ Bán: ${i.code}`, subtitle: context ? `${sub} • ${context}` : sub, badge: i.status, date: i.date.toISOString(), link: `/sales/invoices/${i.id}` });
            });
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
                take: limit, select: {
                    id: true, title: true, status: true, content: true,
                    customer: { select: { name: true } }, createdAt: true
                }
            });
            quotes.forEach((q: any) => {
                let context = null;
                if (!q.title?.toLowerCase().includes(searchLower) && !q.customer?.name?.toLowerCase().includes(searchLower)) {
                    context = getMatchSnippet(q.content, search, 'nội dung');
                }
                const sub = q.customer?.name || 'KH Tự do';
                results.push({ id: q.id, type: 'QUOTE', title: q.title, subtitle: context ? `${sub} • ${context}` : sub, badge: q.status, date: q.createdAt.toISOString(), link: `/quotes/${q.id}` });
            });
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
                take: limit, select: {
                    id: true, title: true, status: true, content: true,
                    customer: { select: { name: true } }, createdAt: true
                }
            });
            contracts.forEach((c: any) => {
                let context = null;
                if (!c.title?.toLowerCase().includes(searchLower) && !c.customer?.name?.toLowerCase().includes(searchLower)) {
                    context = getMatchSnippet(c.content, search, 'nội dung');
                }
                const sub = c.customer?.name || 'KH Tự do';
                results.push({ id: c.id, type: 'CONTRACT', title: c.title, subtitle: context ? `${sub} • ${context}` : sub, badge: c.status, date: c.createdAt.toISOString(), link: `/contracts/${c.id}` });
            });
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
                take: limit, select: {
                    id: true, title: true, status: true, priority: true, dueDate: true, description: true,
                    checklists: { where: { title: { contains: search } }, take: 1, select: { title: true } },
                    comments: { where: { content: { contains: search } }, take: 1, select: { content: true } }
                }
            });
            tasks.forEach((t: any) => {
                let context = null;
                if (!t.title?.toLowerCase().includes(searchLower)) {
                    context = getMatchSnippet(t.description, search, 'mô tả');
                    if (!context && t.checklists?.length > 0) context = getMatchSnippet(t.checklists[0].title, search, 'mục con');
                    if (!context && t.comments?.length > 0) context = getMatchSnippet(t.comments[0].content, search, 'bình luận');
                }
                const sub = `Ưu tiên: ${t.priority}`;
                results.push({ id: t.id, type: 'TASK', title: t.title, subtitle: context ? `${sub} • ${context}` : sub, badge: t.status, date: t.dueDate?.toISOString(), link: `/tasks/${t.id}` });
            });
        }

        const isAdmin = (session.user as any).role === 'ADMIN' || (session.user as any).role === 'MANAGER';
        let leadFilter: any = {};
        if (!isAdmin) {
            leadFilter = {
                OR: [
                    { creatorId: userId },
                    { assignedToId: userId },
                    { assignees: { some: { userId } } }
                ]
            };
        }

        if (leadFilter) {
            const leads = await prisma.lead.findMany({
                where: {
                    AND: [
                        leadFilter,
                        {
                            OR: [
                                { name: { contains: search } },
                                { code: { contains: search } },
                                { notes: { contains: search } },
                                { leadNotes: { some: { content: { contains: search } } } },
                                { comments: { some: { content: { contains: search } } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: {
                    id: true, name: true, code: true, status: true, notes: true,
                    leadNotes: { where: { content: { contains: search } }, take: 1, select: { content: true } },
                    comments: { where: { content: { contains: search } }, take: 1, select: { content: true } },
                    customer: { select: { name: true } }
                }
            });
            leads.forEach((l: any) => {
                let context = null;
                if (!l.name?.toLowerCase().includes(searchLower) && !l.code?.toLowerCase().includes(searchLower)) {
                    context = getMatchSnippet(l.notes, search, 'mô tả');
                    if (!context && l.leadNotes?.length > 0) context = getMatchSnippet(l.leadNotes[0].content, search, 'ghi chú');
                    if (!context && l.comments?.length > 0) context = getMatchSnippet(l.comments[0].content, search, 'bình luận');
                }
                const sub = l.customer?.name || 'Khách lẻ / Tiềm năng';
                results.push({ id: l.id, type: 'LEAD', title: `[${l.code}] ${l.name}`, subtitle: context ? `${sub} • ${context}` : sub, badge: l.status, link: `/sales/leads/${l.id}` });
            });
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
