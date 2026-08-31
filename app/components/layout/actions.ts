'use server';

import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { buildViewFilter } from '@/lib/permissions';

export type SearchResult = {
    id: string;
    type: 'CUSTOMER' | 'SUPPLIER' | 'SALES_ESTIMATE' | 'SALES_ORDER' | 'SALES_INVOICE' | 'PURCHASE_ORDER' | 'PURCHASE_BILL' | 'QUOTE' | 'CONTRACT' | 'TASK' | 'LEAD' | 'PRODUCT' | 'EXPENSE' | 'DISPATCH' | 'HANDOVER' | 'PAYMENT_REQUEST';
    title: string;
    subtitle?: string;
    badge?: string;
    matchSnippet?: string;
    matchLabel?: string;
    link: string;
    date?: string;
};

function getMatchSnippet(text: string | null | undefined, search: string, label: string): { text: string; label: string } | null {
    if (!text) return null;
    const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const lowerText = cleanText.toLowerCase();
    const searchLower = search.toLowerCase();
    const idx = lowerText.indexOf(searchLower);
    if (idx > -1) {
        const start = Math.max(0, idx - 25);
        const end = Math.min(cleanText.length, idx + searchLower.length + 45);
        const snippet = (start > 0 ? '...' : '') + cleanText.substring(start, end).trim() + (end < cleanText.length ? '...' : '');
        return {
            text: snippet,
            label: `Trong ${label}`
        };
    }
    return null;
}

export async function globalSearch(query: string, filterCategory?: string): Promise<SearchResult[]> {
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
        // 1. CUSTOMERS
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
                                { address: { contains: search } },
                                { notes: { some: { content: { contains: search } } } },
                                { contacts: { some: { OR: [{ name: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }] } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: {
                    id: true, name: true, phone: true, email: true, taxCode: true, address: true,
                    notes: { where: { content: { contains: search } }, take: 1, select: { content: true } },
                    contacts: { where: { OR: [{ name: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }] }, take: 1, select: { name: true, phone: true } }
                }
            });
            customers.forEach((c: any) => {
                let matchSnippetObj: { text: string; label: string } | null = null;
                let context: string | null = null;
                if (!c.name?.toLowerCase().includes(searchLower) && !c.phone?.toLowerCase().includes(searchLower)) {
                    if (c.email?.toLowerCase().includes(searchLower)) context = `Email: ${c.email}`;
                    else if (c.taxCode?.toLowerCase().includes(searchLower)) context = `MST: ${c.taxCode}`;
                    else if (c.address?.toLowerCase().includes(searchLower)) context = `Đ/C: ${c.address}`;
                    else if (c.contacts?.length > 0) context = `Liên hệ: ${c.contacts[0].name} (${c.contacts[0].phone || ''})`;
                    
                    if (c.notes?.length > 0) {
                        matchSnippetObj = getMatchSnippet(c.notes[0].content, search, 'ghi chú');
                    }
                } else if (c.notes?.length > 0) {
                    matchSnippetObj = getMatchSnippet(c.notes[0].content, search, 'ghi chú');
                }
                const sub = c.phone || c.email || 'Khách hàng';
                results.push({
                    id: c.id,
                    type: 'CUSTOMER',
                    title: c.name,
                    subtitle: context ? `${sub} • ${context}` : sub,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    link: `/customers/${c.id}`
                });
            });
        }

        // 2. SUPPLIERS
        const suppFilter = buildViewFilter(userId, perms, 'SUPPLIERS');
        if (suppFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const suppliers = await prisma.supplier.findMany({
                where: {
                    AND: [
                        suppFilter,
                        {
                            OR: [
                                { name: { contains: search } },
                                { code: { contains: search } },
                                { phone: { contains: search } },
                                { email: { contains: search } },
                                { taxCode: { contains: search } },
                                { address: { contains: search } },
                                { notes: { contains: search } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: { id: true, name: true, code: true, phone: true, notes: true }
            });
            suppliers.forEach((s: any) => {
                const noteMatch = getMatchSnippet(s.notes, search, 'ghi chú');
                results.push({
                    id: s.id,
                    type: 'SUPPLIER',
                    title: s.name,
                    subtitle: `${s.code} ${s.phone ? '• ' + s.phone : ''}`,
                    matchSnippet: noteMatch?.text,
                    matchLabel: noteMatch?.label,
                    link: `/suppliers/${s.id}`
                });
            });
        }

        // 3. SALES ESTIMATES
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
                                { customer: { name: { contains: search } } },
                                { items: { some: { OR: [{ customName: { contains: search } }, { description: { contains: search } }, { product: { name: { contains: search } } }] } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: {
                    id: true, code: true, date: true, status: true, notes: true, tags: true,
                    customer: { select: { name: true } },
                    items: {
                        where: { OR: [{ customName: { contains: search } }, { description: { contains: search } }, { product: { name: { contains: search } } }] },
                        take: 1,
                        select: { customName: true, description: true, product: { select: { name: true } } }
                    }
                }
            });
            estimates.forEach((e: any) => {
                let matchSnippetObj = getMatchSnippet(e.notes, search, 'ghi chú') ||
                                      getMatchSnippet(e.tags, search, 'thẻ');
                if (!matchSnippetObj && e.items?.length > 0) {
                    const itemText = e.items[0].customName || e.items[0].product?.name || e.items[0].description;
                    matchSnippetObj = getMatchSnippet(itemText, search, 'sản phẩm');
                }
                const sub = e.customer?.name || 'Khách lẻ';
                results.push({
                    id: e.id,
                    type: 'SALES_ESTIMATE',
                    title: `Báo Giá: ${e.code}`,
                    subtitle: sub,
                    badge: e.status,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    date: e.date.toISOString(),
                    link: `/sales/estimates/${e.id}`
                });
            });
        }

        // 4. SALES ORDERS
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
                                { customer: { name: { contains: search } } },
                                { items: { some: { OR: [{ customName: { contains: search } }, { description: { contains: search } }, { product: { name: { contains: search } } }] } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: {
                    id: true, code: true, date: true, status: true, notes: true,
                    customer: { select: { name: true } },
                    items: {
                        where: { OR: [{ customName: { contains: search } }, { description: { contains: search } }, { product: { name: { contains: search } } }] },
                        take: 1,
                        select: { customName: true, description: true, product: { select: { name: true } } }
                    }
                }
            });
            orders.forEach((o: any) => {
                let matchSnippetObj = getMatchSnippet(o.notes, search, 'ghi chú');
                if (!matchSnippetObj && o.items?.length > 0) {
                    const itemText = o.items[0].customName || o.items[0].product?.name || o.items[0].description;
                    matchSnippetObj = getMatchSnippet(itemText, search, 'sản phẩm');
                }
                const sub = o.customer?.name || 'Khách lẻ';
                results.push({
                    id: o.id,
                    type: 'SALES_ORDER',
                    title: `Đơn Hàng: ${o.code}`,
                    subtitle: sub,
                    badge: o.status,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    date: o.date.toISOString(),
                    link: `/sales/orders/${o.id}`
                });
            });
        }

        // 5. SALES INVOICES
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
                                { items: { some: { OR: [{ customName: { contains: search } }, { description: { contains: search } }, { product: { name: { contains: search } } }] } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: {
                    id: true, code: true, date: true, status: true, notes: true, tags: true,
                    customer: { select: { name: true } },
                    invoiceNotes: { where: { content: { contains: search } }, take: 1, select: { content: true } },
                    items: {
                        where: { OR: [{ customName: { contains: search } }, { description: { contains: search } }, { product: { name: { contains: search } } }] },
                        take: 1,
                        select: { customName: true, description: true, product: { select: { name: true } } }
                    }
                }
            });
            invoices.forEach((i: any) => {
                let matchSnippetObj = getMatchSnippet(i.notes, search, 'ghi chú') || getMatchSnippet(i.tags, search, 'thẻ');
                if (!matchSnippetObj && i.invoiceNotes?.length > 0) {
                    matchSnippetObj = getMatchSnippet(i.invoiceNotes[0].content, search, 'ghi chú hóa đơn');
                }
                if (!matchSnippetObj && i.items?.length > 0) {
                    const itemText = i.items[0].customName || i.items[0].product?.name || i.items[0].description;
                    matchSnippetObj = getMatchSnippet(itemText, search, 'sản phẩm');
                }
                const sub = i.customer?.name || 'Khách lẻ';
                results.push({
                    id: i.id,
                    type: 'SALES_INVOICE',
                    title: `HĐ Bán: ${i.code}`,
                    subtitle: sub,
                    badge: i.status,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    date: i.date.toISOString(),
                    link: `/sales/invoices/${i.id}`
                });
            });
        }

        // 6. PURCHASE ORDERS
        const poFilter = buildViewFilter(userId, perms, 'PURCHASE_ORDERS', 'creatorId');
        if (poFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const pos = await prisma.purchaseOrder.findMany({
                where: {
                    AND: [
                        poFilter,
                        {
                            OR: [
                                { code: { contains: search } },
                                { notes: { contains: search } },
                                { supplier: { name: { contains: search } } },
                                { items: { some: { OR: [{ productName: { contains: search } }, { description: { contains: search } }] } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: {
                    id: true, code: true, date: true, status: true, notes: true,
                    supplier: { select: { name: true } },
                    items: { where: { OR: [{ productName: { contains: search } }, { description: { contains: search } }] }, take: 1, select: { productName: true, description: true } }
                }
            });
            pos.forEach((p: any) => {
                let matchSnippetObj = getMatchSnippet(p.notes, search, 'ghi chú');
                if (!matchSnippetObj && p.items?.length > 0) {
                    matchSnippetObj = getMatchSnippet(p.items[0].productName || p.items[0].description, search, 'sản phẩm');
                }
                results.push({
                    id: p.id,
                    type: 'PURCHASE_ORDER',
                    title: `Đơn Mua: ${p.code}`,
                    subtitle: p.supplier?.name || 'NCC',
                    badge: p.status,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    date: p.date.toISOString(),
                    link: `/purchasing/orders/${p.id}`
                });
            });
        }

        // 7. PURCHASE BILLS
        const pbFilter = buildViewFilter(userId, perms, 'PURCHASE_BILLS', 'creatorId');
        if (pbFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const pbs = await prisma.purchaseBill.findMany({
                where: {
                    AND: [
                        pbFilter,
                        {
                            OR: [
                                { code: { contains: search } },
                                { supplierInvoice: { contains: search } },
                                { notes: { contains: search } },
                                { tags: { contains: search } },
                                { supplier: { name: { contains: search } } },
                                { items: { some: { OR: [{ productName: { contains: search } }, { description: { contains: search } }] } } }
                            ]
                        }
                    ]
                } as any,
                take: limit, select: {
                    id: true, code: true, supplierInvoice: true, date: true, status: true, notes: true,
                    supplier: { select: { name: true } },
                    items: { where: { OR: [{ productName: { contains: search } }, { description: { contains: search } }] }, take: 1, select: { productName: true, description: true } }
                }
            });
            pbs.forEach((b: any) => {
                let matchSnippetObj = getMatchSnippet(b.notes, search, 'ghi chú');
                if (!matchSnippetObj && b.supplierInvoice?.toLowerCase().includes(searchLower)) {
                    matchSnippetObj = { text: `Số HĐ NCC: ${b.supplierInvoice}`, label: 'Số hóa đơn NCC' };
                }
                if (!matchSnippetObj && b.items?.length > 0) {
                    matchSnippetObj = getMatchSnippet(b.items[0].productName || b.items[0].description, search, 'sản phẩm');
                }
                results.push({
                    id: b.id,
                    type: 'PURCHASE_BILL',
                    title: `HĐ Mua: ${b.code}`,
                    subtitle: b.supplier?.name || 'NCC',
                    badge: b.status,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    date: b.date.toISOString(),
                    link: `/purchasing/bills/${b.id}`
                });
            });
        }

        // 8. QUOTES
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
                const matchSnippetObj = getMatchSnippet(q.content, search, 'nội dung');
                const sub = q.customer?.name || 'KH Tự do';
                results.push({
                    id: q.id,
                    type: 'QUOTE',
                    title: q.title,
                    subtitle: sub,
                    badge: q.status,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    date: q.createdAt.toISOString(),
                    link: `/quotes/${q.id}`
                });
            });
        }

        // 9. CONTRACTS
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
                const matchSnippetObj = getMatchSnippet(c.content, search, 'nội dung');
                const sub = c.customer?.name || 'KH Tự do';
                results.push({
                    id: c.id,
                    type: 'CONTRACT',
                    title: c.title,
                    subtitle: sub,
                    badge: c.status,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    date: c.createdAt.toISOString(),
                    link: `/contracts/${c.id}`
                });
            });
        }

        // 10. TASKS
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
                let matchSnippetObj = getMatchSnippet(t.description, search, 'mô tả');
                if (!matchSnippetObj && t.checklists?.length > 0) {
                    matchSnippetObj = getMatchSnippet(t.checklists[0].title, search, 'mục kiểm tra');
                }
                if (!matchSnippetObj && t.comments?.length > 0) {
                    matchSnippetObj = getMatchSnippet(t.comments[0].content, search, 'bình luận');
                }
                const sub = `Ưu tiên: ${t.priority}`;
                results.push({
                    id: t.id,
                    type: 'TASK',
                    title: t.title,
                    subtitle: sub,
                    badge: t.status,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    date: t.dueDate?.toISOString(),
                    link: `/tasks/${t.id}`
                });
            });
        }

        // 11. LEADS
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
                let matchSnippetObj = getMatchSnippet(l.notes, search, 'mô tả');
                if (!matchSnippetObj && l.leadNotes?.length > 0) {
                    matchSnippetObj = getMatchSnippet(l.leadNotes[0].content, search, 'ghi chú cơ hội');
                }
                if (!matchSnippetObj && l.comments?.length > 0) {
                    matchSnippetObj = getMatchSnippet(l.comments[0].content, search, 'bình luận');
                }
                const sub = l.customer?.name || 'Khách lẻ / Tiềm năng';
                results.push({
                    id: l.id,
                    type: 'LEAD',
                    title: `[${l.code}] ${l.name}`,
                    subtitle: sub,
                    badge: l.status,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    link: `/sales/leads/${l.id}`
                });
            });
        }

        // 12. PRODUCTS & INVENTORY
        const prodFilter = buildViewFilter(userId, perms, 'PRODUCTS');
        if (prodFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const products = await prisma.product.findMany({
                where: {
                    AND: [
                        prodFilter,
                        {
                            OR: [
                                { name: { contains: search } },
                                { sku: { contains: search } },
                                { description: { contains: search } },
                                { notes: { contains: search } }
                            ]
                        }
                    ]
                } as any,
                take: limit,
                select: { id: true, name: true, sku: true, salePrice: true, unit: true, description: true, notes: true }
            });
            products.forEach((p: any) => {
                let matchSnippetObj = getMatchSnippet(p.description, search, 'mô tả') || getMatchSnippet(p.notes, search, 'ghi chú');
                results.push({
                    id: p.id,
                    type: 'PRODUCT',
                    title: p.name,
                    subtitle: `SKU: ${p.sku} • ${p.salePrice.toLocaleString('vi-VN')} đ/${p.unit || 'Cái'}`,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    link: `/inventory/products`
                });
            });
        }

        // 13. EXPENSES
        const expFilter = buildViewFilter(userId, perms, 'SALES_EXPENSES', 'creatorId');
        if (expFilter.id !== 'UNAUTHORIZED_NO_ACCESS') {
            const expenses = await prisma.expense.findMany({
                where: {
                    AND: [
                        expFilter,
                        {
                            OR: [
                                { code: { contains: search } },
                                { payee: { contains: search } },
                                { description: { contains: search } },
                                { reference: { contains: search } },
                                { notes: { some: { content: { contains: search } } } }
                            ]
                        }
                    ]
                } as any,
                take: limit,
                select: {
                    id: true, code: true, amount: true, payee: true, description: true, status: true, date: true,
                    notes: { where: { content: { contains: search } }, take: 1, select: { content: true } }
                }
            });
            expenses.forEach((ex: any) => {
                let matchSnippetObj = getMatchSnippet(ex.description, search, 'mô tả');
                if (!matchSnippetObj && ex.notes?.length > 0) {
                    matchSnippetObj = getMatchSnippet(ex.notes[0].content, search, 'ghi chú chi phí');
                }
                results.push({
                    id: ex.id,
                    type: 'EXPENSE',
                    title: `Chi Phí: ${ex.code} - ${ex.amount.toLocaleString('vi-VN')} đ`,
                    subtitle: ex.payee ? `Người nhận: ${ex.payee}` : 'Chi phí',
                    badge: ex.status,
                    matchSnippet: matchSnippetObj?.text,
                    matchLabel: matchSnippetObj?.label,
                    date: ex.date.toISOString(),
                    link: `/sales/expenses`
                });
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
