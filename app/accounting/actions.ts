'use server'

import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error('Unauthorized: Chưa đăng nhập');
    }
    const permissions = (session.user as any)?.permissions as string[] || [];
    const role = (session.user as any)?.role;
    const canView = permissions.includes('ACCOUNTING_VIEW') || permissions.includes('ACCOUNTING_VIEW_ALL') || role === 'ADMIN';
    if (!canView) {
        throw new Error('Forbidden: Không có quyền truy cập Kế toán');
    }
    return session.user as any;
}

// ---------------------------------------------------------------------------
// 1. TỔNG QUAN TÀI CHÍNH (FINANCIAL DASHBOARD)
// ---------------------------------------------------------------------------
export async function getFinancialOverviewData(year: number = new Date().getFullYear()) {
    await getCurrentUser();

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // 1. All Finance Accounts and Current Balances
    const accounts = await prisma.financeAccount.findMany({
        where: { isActive: true },
        orderBy: { isDefault: 'desc' }
    });

    const totalCashBankBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    // 2. Total Inflows (Sales Payments + Receipts) in current year
    const salesPayments = await prisma.salesPayment.findMany({
        where: {
            date: { gte: startOfYear, lte: endOfYear }
        }
    });
    const totalSalesCollected = salesPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const otherReceipts = await prisma.cashTransaction.findMany({
        where: {
            type: 'RECEIPT',
            status: 'COMPLETED',
            transactionDate: { gte: startOfYear, lte: endOfYear },
            category: { not: 'SALES' }
        }
    });
    const totalOtherReceipts = otherReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalInflow = totalSalesCollected + totalOtherReceipts;

    // 3. Total Outflows (Purchase Payments + Expenses + Payrolls + Cash Payments)
    const purchasePayments = await prisma.purchasePayment.findMany({
        where: {
            date: { gte: startOfYear, lte: endOfYear }
        }
    });
    const totalPurchasePaid = purchasePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const expenses = await prisma.expense.findMany({
        where: {
            date: { gte: startOfYear, lte: endOfYear }
        },
        include: { category: true }
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const payrolls = await prisma.payroll.findMany({
        where: {
            year: year,
            status: 'PAID'
        }
    });
    const totalPayrollPaid = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

    const otherPayments = await prisma.cashTransaction.findMany({
        where: {
            type: 'PAYMENT',
            status: 'COMPLETED',
            transactionDate: { gte: startOfYear, lte: endOfYear },
            category: { notIn: ['PURCHASE', 'EXPENSE', 'PAYROLL'] }
        }
    });
    const totalOtherPayments = otherPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalOutflow = totalPurchasePaid + totalExpenses + totalPayrollPaid + totalOtherPayments;
    const netCashFlow = totalInflow - totalOutflow;

    // 4. Accounts Receivable (AR) from Sales Invoices
    const salesInvoices = await prisma.salesInvoice.findMany({
        where: { status: { not: 'CANCELLED' } },
        select: {
            id: true,
            totalAmount: true,
            paidAmount: true,
            dueDate: true,
            customer: { select: { id: true, name: true, code: true } }
        }
    });

    let totalReceivables = 0;
    let overdueReceivables = 0;
    const now = new Date();

    salesInvoices.forEach(inv => {
        const remaining = inv.totalAmount - (inv.paidAmount || 0);
        if (remaining > 0) {
            totalReceivables += remaining;
            if (inv.dueDate && new Date(inv.dueDate) < now) {
                overdueReceivables += remaining;
            }
        }
    });

    // 5. Accounts Payable (AP) from Purchase Bills
    const purchaseBills = await prisma.purchaseBill.findMany({
        where: { status: { not: 'CANCELLED' } },
        select: {
            id: true,
            totalAmount: true,
            paidAmount: true,
            dueDate: true,
            supplier: { select: { id: true, name: true, code: true } }
        }
    });

    let totalPayables = 0;
    let overduePayables = 0;

    purchaseBills.forEach(bill => {
        const remaining = bill.totalAmount - (bill.paidAmount || 0);
        if (remaining > 0) {
            totalPayables += remaining;
            if (bill.dueDate && new Date(bill.dueDate) < now) {
                overduePayables += remaining;
            }
        }
    });

    // 6. Monthly Cash Flow Data for Charts (12 Months)
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: `T${i + 1}`,
        monthNum: i + 1,
        inflow: 0,
        outflow: 0,
        net: 0
    }));

    salesPayments.forEach(p => {
        const m = new Date(p.date).getMonth();
        monthlyData[m].inflow += p.amount || 0;
    });
    otherReceipts.forEach(r => {
        const m = new Date(r.transactionDate).getMonth();
        monthlyData[m].inflow += r.amount || 0;
    });

    purchasePayments.forEach(p => {
        const m = new Date(p.date).getMonth();
        monthlyData[m].outflow += p.amount || 0;
    });
    expenses.forEach(e => {
        const m = new Date(e.date).getMonth();
        monthlyData[m].outflow += e.amount || 0;
    });
    payrolls.forEach(p => {
        const m = p.month - 1;
        if (m >= 0 && m < 12) {
            monthlyData[m].outflow += p.netSalary || 0;
        }
    });
    otherPayments.forEach(p => {
        const m = new Date(p.transactionDate).getMonth();
        monthlyData[m].outflow += p.amount || 0;
    });

    monthlyData.forEach(item => {
        item.net = item.inflow - item.outflow;
    });

    // 7. Top Expense Categories
    const categoryMap: Record<string, number> = {};
    expenses.forEach(e => {
        const catName = e.category?.name || 'Chi phí khác';
        categoryMap[catName] = (categoryMap[catName] || 0) + (e.amount || 0);
    });
    if (totalPayrollPaid > 0) {
        categoryMap['Chi phí lương & nhân sự'] = totalPayrollPaid;
    }
    if (totalPurchasePaid > 0) {
        categoryMap['Chi mua hàng & vật tư'] = totalPurchasePaid;
    }

    const expenseCategories = Object.entries(categoryMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

    // 8. Recent Transactions
    const recentTransactions = await prisma.cashTransaction.findMany({
        take: 8,
        orderBy: { transactionDate: 'desc' },
        include: {
            financeAccount: true,
            customer: { select: { id: true, name: true, code: true } },
            supplier: { select: { id: true, name: true, code: true } },
            createdBy: { select: { id: true, name: true } }
        }
    });

    return {
        year,
        accounts,
        totalCashBankBalance,
        totalInflow,
        totalOutflow,
        netCashFlow,
        totalSalesCollected,
        totalPurchasePaid,
        totalExpenses,
        totalPayrollPaid,
        totalReceivables,
        overdueReceivables,
        totalPayables,
        overduePayables,
        monthlyData,
        expenseCategories,
        recentTransactions
    };
}

// ---------------------------------------------------------------------------
// 2. SỔ QUÝ THU - CHI (CASH TRANSACTIONS)
// ---------------------------------------------------------------------------
export async function getCashTransactions(params?: {
    type?: string;
    financeAccountId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
}) {
    await getCurrentUser();

    const where: any = {};

    if (params?.type && params.type !== 'ALL') {
        where.type = params.type;
    }
    if (params?.financeAccountId && params.financeAccountId !== 'ALL') {
        where.financeAccountId = params.financeAccountId;
    }
    if (params?.category && params.category !== 'ALL') {
        where.category = params.category;
    }
    if (params?.startDate || params?.endDate) {
        where.transactionDate = {};
        if (params.startDate) where.transactionDate.gte = new Date(params.startDate);
        if (params.endDate) {
            const end = new Date(params.endDate);
            end.setHours(23, 59, 59, 999);
            where.transactionDate.lte = end;
        }
    }
    if (params?.search) {
        const s = params.search.trim();
        where.OR = [
            { code: { contains: s } },
            { payerReceiver: { contains: s } },
            { phone: { contains: s } },
            { reason: { contains: s } },
            { notes: { contains: s } }
        ];
    }

    const transactions = await prisma.cashTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        include: {
            financeAccount: true,
            customer: { select: { id: true, name: true, code: true, phone: true } },
            supplier: { select: { id: true, name: true, code: true, phone: true } },
            project: { select: { id: true, name: true, code: true } },
            createdBy: { select: { id: true, name: true } }
        }
    });

    const accounts = await prisma.financeAccount.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
    });

    const customers = await prisma.customer.findMany({
        select: { id: true, name: true, code: true, phone: true, address: true },
        orderBy: { name: 'asc' }
    });

    const suppliers = await prisma.supplier.findMany({
        select: { id: true, name: true, code: true, phone: true, address: true },
        orderBy: { name: 'asc' }
    });

    const projects = await prisma.project.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
    });

    return { transactions, accounts, customers, suppliers, projects };
}

export async function createCashTransaction(data: {
    type: 'RECEIPT' | 'PAYMENT';
    category?: string;
    transactionDate: string | Date;
    amount: number;
    payerReceiver: string;
    phone?: string;
    address?: string;
    reason?: string;
    paymentMethod?: string;
    financeAccountId?: string;
    customerId?: string;
    supplierId?: string;
    projectId?: string;
    notes?: string;
    attachments?: string;
}) {
    const user = await getCurrentUser();

    // Auto-generate Code: PT-YYMM-XXXX or PC-YYMM-XXXX
    const date = new Date(data.transactionDate);
    const prefix = data.type === 'RECEIPT' ? 'PT' : 'PC';
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const ymPrefix = `${prefix}-${yy}${mm}-`;

    const lastTx = await prisma.cashTransaction.findFirst({
        where: { code: { startsWith: ymPrefix } },
        orderBy: { code: 'desc' },
        select: { code: true }
    });

    let seq = 1;
    if (lastTx && lastTx.code) {
        const parts = lastTx.code.split('-');
        if (parts.length === 3) {
            seq = parseInt(parts[2], 10) + 1;
        }
    }
    const code = `${ymPrefix}${String(seq).padStart(4, '0')}`;

    const tx = await prisma.cashTransaction.create({
        data: {
            code,
            type: data.type,
            category: data.category || 'OTHER',
            transactionDate: new Date(data.transactionDate),
            amount: data.amount,
            payerReceiver: data.payerReceiver,
            phone: data.phone || null,
            address: data.address || null,
            reason: data.reason || null,
            paymentMethod: data.paymentMethod || 'CASH',
            financeAccountId: data.financeAccountId || null,
            customerId: data.customerId || null,
            supplierId: data.supplierId || null,
            projectId: data.projectId || null,
            createdById: user.id,
            status: 'COMPLETED',
            notes: data.notes || null,
            attachments: data.attachments || null
        }
    });

    // Update Finance Account balance
    if (data.financeAccountId) {
        const change = data.type === 'RECEIPT' ? data.amount : -data.amount;
        await prisma.financeAccount.update({
            where: { id: data.financeAccountId },
            data: { currentBalance: { increment: change } }
        });
    }

    revalidatePath('/accounting');
    revalidatePath('/accounting/cash-book');
    revalidatePath('/accounting/accounts');
    return { success: true, data: tx };
}

export async function deleteCashTransaction(id: string) {
    await getCurrentUser();

    const tx = await prisma.cashTransaction.findUnique({
        where: { id }
    });
    if (!tx) throw new Error('Không tìm thấy chứng từ');

    // Revert account balance if completed
    if (tx.financeAccountId && tx.status === 'COMPLETED') {
        const revert = tx.type === 'RECEIPT' ? -tx.amount : tx.amount;
        await prisma.financeAccount.update({
            where: { id: tx.financeAccountId },
            data: { currentBalance: { increment: revert } }
        }).catch(() => {});
    }

    await prisma.cashTransaction.delete({
        where: { id }
    });

    revalidatePath('/accounting');
    revalidatePath('/accounting/cash-book');
    revalidatePath('/accounting/accounts');
    return { success: true };
}

// ---------------------------------------------------------------------------
// 3. TÀI KHOẢN NGÂN HÀNG & QUỸ (FINANCE ACCOUNTS)
// ---------------------------------------------------------------------------
export async function getFinanceAccounts() {
    await getCurrentUser();
    const accounts = await prisma.financeAccount.findMany({
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: {
            _count: {
                select: { transactions: true }
            }
        }
    });
    return accounts;
}

export async function createFinanceAccount(data: {
    code: string;
    name: string;
    type: 'BANK' | 'CASH';
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    currency?: string;
    initialBalance?: number;
    description?: string;
    isDefault?: boolean;
}) {
    await getCurrentUser();

    if (data.isDefault) {
        await prisma.financeAccount.updateMany({
            where: { isDefault: true },
            data: { isDefault: false }
        });
    }

    const initBal = data.initialBalance || 0;
    const account = await prisma.financeAccount.create({
        data: {
            code: data.code.trim().toUpperCase(),
            name: data.name.trim(),
            type: data.type,
            accountNumber: data.accountNumber || null,
            bankName: data.bankName || null,
            branch: data.branch || null,
            currency: data.currency || 'VND',
            initialBalance: initBal,
            currentBalance: initBal,
            description: data.description || null,
            isDefault: data.isDefault || false,
            isActive: true
        }
    });

    revalidatePath('/accounting/accounts');
    revalidatePath('/accounting');
    return { success: true, data: account };
}

export async function updateFinanceAccount(id: string, data: {
    name?: string;
    type?: string;
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    currency?: string;
    description?: string;
    isActive?: boolean;
    isDefault?: boolean;
}) {
    await getCurrentUser();

    if (data.isDefault) {
        await prisma.financeAccount.updateMany({
            where: { id: { not: id }, isDefault: true },
            data: { isDefault: false }
        });
    }

    const updated = await prisma.financeAccount.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name.trim() }),
            ...(data.type && { type: data.type }),
            accountNumber: data.accountNumber ?? undefined,
            bankName: data.bankName ?? undefined,
            branch: data.branch ?? undefined,
            currency: data.currency ?? undefined,
            description: data.description ?? undefined,
            ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
            ...(typeof data.isDefault === 'boolean' && { isDefault: data.isDefault })
        }
    });

    revalidatePath('/accounting/accounts');
    revalidatePath('/accounting');
    return { success: true, data: updated };
}

// ---------------------------------------------------------------------------
// 4. QUẢN LÝ CÔNG NỢ (DEBT MANAGEMENT - AR & AP)
// ---------------------------------------------------------------------------
export async function getDebtOverviewData() {
    await getCurrentUser();
    const now = new Date();

    // 1. Customer Debts (AR)
    const customers = await prisma.customer.findMany({
        orderBy: { name: 'asc' },
        include: {
            salesInvoices: {
                where: { status: { not: 'CANCELLED' } },
                orderBy: { date: 'desc' }
            },
            salesPayments: {
                orderBy: { date: 'desc' }
            }
        }
    });

    const customerDebts = customers.map(c => {
        const totalInvoiced = c.salesInvoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0);
        const totalPaid = c.salesPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const currentDebt = Math.max(0, totalInvoiced - totalPaid);

        // Calculate Aging based on unpaid invoices
        let inDue = 0;
        let overdue1to30 = 0;
        let overdue31to60 = 0;
        let overdue61to90 = 0;
        let overdueOver90 = 0;

        c.salesInvoices.forEach((inv: any) => {
            const invRemaining = inv.totalAmount - (inv.paidAmount || 0);
            if (invRemaining > 0) {
                const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.date);
                const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays <= 0) {
                    inDue += invRemaining;
                } else if (diffDays <= 30) {
                    overdue1to30 += invRemaining;
                } else if (diffDays <= 60) {
                    overdue31to60 += invRemaining;
                } else if (diffDays <= 90) {
                    overdue61to90 += invRemaining;
                } else {
                    overdueOver90 += invRemaining;
                }
            }
        });

        return {
            id: c.id,
            code: c.code || 'KH-CHUACO',
            name: c.name,
            phone: c.phone || '',
            email: c.email || '',
            taxCode: c.taxCode || '',
            address: c.address || '',
            totalInvoiced,
            totalPaid,
            currentDebt,
            inDue,
            overdue1to30,
            overdue31to60,
            overdue61to90,
            overdueOver90,
            totalOverdue: overdue1to30 + overdue31to60 + overdue61to90 + overdueOver90,
            invoiceCount: c.salesInvoices.length,
            invoices: c.salesInvoices.map((inv: any) => ({
                id: inv.id,
                code: inv.code,
                issueDate: inv.date,
                dueDate: inv.dueDate,
                totalAmount: inv.totalAmount,
                paidAmount: inv.paidAmount,
                remainingAmount: inv.totalAmount - (inv.paidAmount || 0),
                status: inv.status
            }))
        };
    }).filter(c => c.totalInvoiced > 0 || c.currentDebt > 0);

    // 2. Supplier Debts (AP)
    const suppliers = await prisma.supplier.findMany({
        orderBy: { name: 'asc' },
        include: {
            bills: {
                where: { status: { not: 'CANCELLED' } },
                orderBy: { date: 'desc' }
            },
            payments: {
                orderBy: { date: 'desc' }
            }
        }
    });

    const supplierDebts = suppliers.map(s => {
        const totalBilled = s.bills.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0);
        const totalPaid = s.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const currentDebt = Math.max(0, totalBilled - totalPaid);

        let inDue = 0;
        let overdue1to30 = 0;
        let overdue31to60 = 0;
        let overdue61to90 = 0;
        let overdueOver90 = 0;

        s.bills.forEach((bill: any) => {
            const billRemaining = bill.totalAmount - (bill.paidAmount || 0);
            if (billRemaining > 0) {
                const dueDate = bill.dueDate ? new Date(bill.dueDate) : new Date(bill.date);
                const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays <= 0) {
                    inDue += billRemaining;
                } else if (diffDays <= 30) {
                    overdue1to30 += billRemaining;
                } else if (diffDays <= 60) {
                    overdue31to60 += billRemaining;
                } else if (diffDays <= 90) {
                    overdue61to90 += billRemaining;
                } else {
                    overdueOver90 += billRemaining;
                }
            }
        });

        return {
            id: s.id,
            code: s.code,
            name: s.name,
            phone: s.phone || '',
            email: s.email || '',
            taxCode: s.taxCode || '',
            address: s.address || '',
            totalBilled,
            totalPaid,
            currentDebt,
            inDue,
            overdue1to30,
            overdue31to60,
            overdue61to90,
            overdueOver90,
            totalOverdue: overdue1to30 + overdue31to60 + overdue61to90 + overdueOver90,
            billCount: s.bills.length,
            bills: s.bills.map((b: any) => ({
                id: b.id,
                code: b.code,
                billDate: b.date,
                dueDate: b.dueDate,
                totalAmount: b.totalAmount,
                paidAmount: b.paidAmount,
                remainingAmount: b.totalAmount - (b.paidAmount || 0),
                status: b.status
            }))
        };
    }).filter(s => s.totalBilled > 0 || s.currentDebt > 0);

    return { customerDebts, supplierDebts };
}

// ---------------------------------------------------------------------------
// 5. BÁO CÁO TÀI CHÍNH (P&L, CASH FLOW, EXPENSE ANALYSIS)
// ---------------------------------------------------------------------------
export async function getFinancialReportsData(year: number = new Date().getFullYear()) {
    await getCurrentUser();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    // 1. Revenue
    const salesInvoices = await prisma.salesInvoice.findMany({
        where: {
            date: { gte: startOfYear, lte: endOfYear },
            status: { not: 'CANCELLED' }
        },
        include: { items: true }
    });
    const grossRevenue = salesInvoices.reduce((sum, inv) => sum + (inv.subTotal || inv.totalAmount || 0), 0);
    const discountTotal = 0; // Discount if any
    const netRevenue = grossRevenue - discountTotal;

    // 2. Cost of Goods Sold (COGS)
    const purchaseBills = await prisma.purchaseBill.findMany({
        where: {
            date: { gte: startOfYear, lte: endOfYear },
            status: { not: 'CANCELLED' }
        },
        include: { items: true }
    });
    const cogs = purchaseBills.reduce((sum, b) => sum + (b.subTotal || b.totalAmount || 0), 0);
    const grossProfit = netRevenue - cogs;
    const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    // 3. Operating Expenses
    const expenses = await prisma.expense.findMany({
        where: {
            date: { gte: startOfYear, lte: endOfYear }
        },
        include: { category: true, project: true }
    });
    const totalOperatingExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 4. Personnel Expenses (Payroll)
    const payrolls = await prisma.payroll.findMany({
        where: { year, status: 'PAID' }
    });
    const totalPersonnelExpenses = payrolls.reduce((sum, p) => sum + (p.netSalary + p.insuranceDeduction), 0);

    // 5. Operating Profit (EBIT) & Net Profit
    const totalCosts = cogs + totalOperatingExpenses + totalPersonnelExpenses;
    const netProfit = netRevenue - totalCosts;
    const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    // 6. Expense breakdown by category
    const expenseByCategory: Record<string, number> = {};
    expenses.forEach(e => {
        const cat = e.category?.name || 'Chi phí hoạt động khác';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
    });

    // 7. Cash Flow Statement
    const salesPayments = await prisma.salesPayment.findMany({
        where: { date: { gte: startOfYear, lte: endOfYear } }
    });
    const cfReceiptsFromCustomers = salesPayments.reduce((sum, p) => sum + p.amount, 0);

    const purchasePayments = await prisma.purchasePayment.findMany({
        where: { date: { gte: startOfYear, lte: endOfYear } }
    });
    const cfPaymentsToSuppliers = purchasePayments.reduce((sum, p) => sum + p.amount, 0);
    const cfPaymentsToEmployees = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
    const cfOperatingExpenses = totalOperatingExpenses;

    const netOperatingCashFlow = cfReceiptsFromCustomers - (cfPaymentsToSuppliers + cfPaymentsToEmployees + cfOperatingExpenses);

    return {
        year,
        pl: {
            grossRevenue,
            discountTotal,
            netRevenue,
            cogs,
            grossProfit,
            grossMargin,
            totalOperatingExpenses,
            totalPersonnelExpenses,
            totalCosts,
            netProfit,
            netMargin,
            expenseByCategory
        },
        cashFlow: {
            cfReceiptsFromCustomers,
            cfPaymentsToSuppliers,
            cfPaymentsToEmployees,
            cfOperatingExpenses,
            netOperatingCashFlow
        }
    };
}
