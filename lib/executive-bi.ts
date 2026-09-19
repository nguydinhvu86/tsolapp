import { prisma } from '@/lib/prisma';

export interface CashFlowBucket {
    period: 'DAY_1_30' | 'DAY_31_60' | 'DAY_61_90';
    periodLabel: string;
    expectedInflow: number;  // Thu tiền dự kiến (Hóa đơn bán hàng đến hạn + Báo giá sắp chốt)
    expectedOutflow: number; // Chi tiền dự kiến (Hóa đơn mua hàng đến hạn + Lương + Chi phí cố định)
    netCashFlow: number;     // Dòng tiền ròng trong kỳ (Inflow - Outflow)
    projectedBalance: number; // Số dư tiền mặt lũy kế cuối kỳ
    isDeficit: boolean;      // Cảnh báo âm tiền
}

export interface AgingBucket {
    partnerId: string;
    partnerName: string;
    partnerPhone?: string | null;
    totalDebt: number;
    currentAmount: number;     // Trong hạn (Chưa đến ngày dueDate)
    overdue1To30: number;      // Quá hạn 1 - 30 ngày
    overdue31To60: number;     // Quá hạn 31 - 60 ngày
    overdue61To90: number;     // Quá hạn 61 - 90 ngày
    overdue90Plus: number;     // Quá hạn > 90 ngày (Nợ xấu / khó đòi)
}

/**
 * 1. DỰ BÁO DÒNG TIỀN ĐỘNG 30 - 60 - 90 NGÀY (Rolling Cash-Flow Forecast)
 */
export async function getRollingCashFlowForecast() {
    // 1.1 Tính tổng số dư tiền mặt hiện tại từ các tài khoản quỹ / ngân hàng
    const financeAccounts = await prisma.financeAccount.findMany({
        where: { isActive: true },
        select: { currentBalance: true }
    });
    const currentCashBalance = financeAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);

    const now = new Date();
    const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const day60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const day90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 1.2 Lấy các Hóa đơn bán hàng chưa thanh toán hết (Dòng tiền VÀO dự kiến)
    const unpaidInvoices = await prisma.salesInvoice.findMany({
        where: {
            status: { in: ['DRAFT', 'ISSUED', 'PARTIAL_PAID'] }
        },
        select: {
            totalAmount: true,
            paidAmount: true,
            dueDate: true,
            date: true
        }
    });

    // 1.3 Lấy các Hóa đơn mua hàng NCC chưa thanh toán hết (Dòng tiền RA dự kiến)
    const unpaidBills = await prisma.purchaseBill.findMany({
        where: {
            status: { in: ['DRAFT', 'APPROVED', 'PARTIAL_PAID'] }
        },
        select: {
            totalAmount: true,
            paidAmount: true,
            dueDate: true,
            date: true
        }
    });

    // 1.4 Ước tính chi phí vận hành & lương cố định trung bình 1 tháng
    const recentExpenses = await prisma.expense.findMany({
        where: {
            status: 'COMPLETED',
            date: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
        },
        select: { amount: true }
    });
    const monthlyOperatingExpense = recentExpenses.length > 0 
        ? (recentExpenses.reduce((s, e) => s + e.amount, 0) / 3) 
        : 50000000; // Mặc định ước tính

    // Phân loại dòng tiền theo 3 chu kỳ
    const buckets: { in: number; out: number }[] = [
        { in: 0, out: monthlyOperatingExpense }, // 1-30
        { in: 0, out: monthlyOperatingExpense }, // 31-60
        { in: 0, out: monthlyOperatingExpense }  // 61-90
    ];

    for (const inv of unpaidInvoices) {
        const remaining = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
        if (remaining <= 0) continue;
        const targetDate = inv.dueDate || new Date(inv.date.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        if (targetDate <= day30) buckets[0].in += remaining;
        else if (targetDate <= day60) buckets[1].in += remaining;
        else if (targetDate <= day90) buckets[2].in += remaining;
        else buckets[2].in += remaining;
    }

    for (const bill of unpaidBills) {
        const remaining = Math.max(0, bill.totalAmount - (bill.paidAmount || 0));
        if (remaining <= 0) continue;
        const targetDate = bill.dueDate || new Date(bill.date.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (targetDate <= day30) buckets[0].out += remaining;
        else if (targetDate <= day60) buckets[1].out += remaining;
        else if (targetDate <= day90) buckets[2].out += remaining;
        else buckets[2].out += remaining;
    }

    let runningBalance = currentCashBalance;
    const forecastResults: CashFlowBucket[] = [
        {
            period: 'DAY_1_30',
            periodLabel: '30 ngày tới',
            expectedInflow: Math.round(buckets[0].in),
            expectedOutflow: Math.round(buckets[0].out),
            netCashFlow: Math.round(buckets[0].in - buckets[0].out),
            projectedBalance: Math.round(runningBalance + (buckets[0].in - buckets[0].out)),
            isDeficit: (runningBalance + (buckets[0].in - buckets[0].out)) < 0
        },
        {
            period: 'DAY_31_60',
            periodLabel: '31 - 60 ngày tới',
            expectedInflow: Math.round(buckets[1].in),
            expectedOutflow: Math.round(buckets[1].out),
            netCashFlow: Math.round(buckets[1].in - buckets[1].out),
            projectedBalance: Math.round(runningBalance + (buckets[0].in - buckets[0].out) + (buckets[1].in - buckets[1].out)),
            isDeficit: (runningBalance + (buckets[0].in - buckets[0].out) + (buckets[1].in - buckets[1].out)) < 0
        },
        {
            period: 'DAY_61_90',
            periodLabel: '61 - 90 ngày tới',
            expectedInflow: Math.round(buckets[2].in),
            expectedOutflow: Math.round(buckets[2].out),
            netCashFlow: Math.round(buckets[2].in - buckets[2].out),
            projectedBalance: Math.round(runningBalance + (buckets[0].in - buckets[0].out) + (buckets[1].in - buckets[1].out) + (buckets[2].in - buckets[2].out)),
            isDeficit: (runningBalance + (buckets[0].in - buckets[0].out) + (buckets[1].in - buckets[1].out) + (buckets[2].in - buckets[2].out)) < 0
        }
    ];

    return {
        currentCashBalance: Math.round(currentCashBalance),
        forecastResults,
        hasDeficitWarning: forecastResults.some(b => b.isDeficit)
    };
}

/**
 * 2. BÁO CÁO PHÂN TÍCH TUỔI NỢ (Aging Debt Report: 1-30, 31-60, 61-90, >90 ngày)
 */
export async function getAgingDebtReport(type: 'CUSTOMER' | 'SUPPLIER') {
    const now = new Date();
    const partnerMap = new Map<string, AgingBucket>();

    if (type === 'CUSTOMER') {
        const invoices = await prisma.salesInvoice.findMany({
            where: {
                status: { in: ['DRAFT', 'ISSUED', 'PARTIAL_PAID'] }
            },
            include: { customer: true }
        });

        for (const inv of invoices) {
            const remaining = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
            if (remaining <= 0) continue;

            const partnerId = inv.customerId;
            const partnerName = inv.customer?.name || 'Khách vãng lai';
            const partnerPhone = inv.customer?.phone;

            if (!partnerMap.has(partnerId)) {
                partnerMap.set(partnerId, {
                    partnerId,
                    partnerName,
                    partnerPhone,
                    totalDebt: 0,
                    currentAmount: 0,
                    overdue1To30: 0,
                    overdue31To60: 0,
                    overdue61To90: 0,
                    overdue90Plus: 0
                });
            }

            const item = partnerMap.get(partnerId)!;
            item.totalDebt += remaining;

            const dueDate = inv.dueDate || inv.date;
            const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                item.currentAmount += remaining;
            } else if (diffDays <= 30) {
                item.overdue1To30 += remaining;
            } else if (diffDays <= 60) {
                item.overdue31To60 += remaining;
            } else if (diffDays <= 90) {
                item.overdue61To90 += remaining;
            } else {
                item.overdue90Plus += remaining;
            }
        }
    } else {
        const bills = await prisma.purchaseBill.findMany({
            where: {
                status: { in: ['DRAFT', 'APPROVED', 'PARTIAL_PAID'] }
            },
            include: { supplier: true }
        });

        for (const bill of bills) {
            const remaining = Math.max(0, bill.totalAmount - (bill.paidAmount || 0));
            if (remaining <= 0) continue;

            const partnerId = bill.supplierId;
            const partnerName = bill.supplier?.name || 'Nhà cung cấp';
            const partnerPhone = bill.supplier?.phone;

            if (!partnerMap.has(partnerId)) {
                partnerMap.set(partnerId, {
                    partnerId,
                    partnerName,
                    partnerPhone,
                    totalDebt: 0,
                    currentAmount: 0,
                    overdue1To30: 0,
                    overdue31To60: 0,
                    overdue61To90: 0,
                    overdue90Plus: 0
                });
            }

            const item = partnerMap.get(partnerId)!;
            item.totalDebt += remaining;

            const dueDate = bill.dueDate || bill.date;
            const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                item.currentAmount += remaining;
            } else if (diffDays <= 30) {
                item.overdue1To30 += remaining;
            } else if (diffDays <= 60) {
                item.overdue31To60 += remaining;
            } else if (diffDays <= 90) {
                item.overdue61To90 += remaining;
            } else {
                item.overdue90Plus += remaining;
            }
        }
    }

    const items = Array.from(partnerMap.values()).sort((a, b) => b.totalDebt - a.totalDebt);
    const summary = {
        totalDebt: items.reduce((s, i) => s + i.totalDebt, 0),
        totalCurrent: items.reduce((s, i) => s + i.currentAmount, 0),
        totalOverdue1To30: items.reduce((s, i) => s + i.overdue1To30, 0),
        totalOverdue31To60: items.reduce((s, i) => s + i.overdue31To60, 0),
        totalOverdue61To90: items.reduce((s, i) => s + i.overdue61To90, 0),
        totalOverdue90Plus: items.reduce((s, i) => s + i.overdue90Plus, 0),
    };

    return { type, summary, items };
}

/**
 * 3. BÁO CÁO PHÂN TÍCH LỢI NHUẬN DỰ ÁN (Project Profitability & P&L Analysis)
 */
export async function getProjectProfitabilityAnalysis() {
    const projects = await prisma.project.findMany({
        include: {
            customer: { select: { id: true, name: true } },
            purchaseBills: { select: { totalAmount: true, status: true } },
            expenses: { select: { amount: true, status: true } }
        }
    });

    const results = [];

    for (const p of projects) {
        // Doanh thu từ hóa đơn bán hàng liên kết
        const invoices = await prisma.salesInvoice.findMany({
            where: {
                OR: [
                    { projects: { some: { id: p.id } } },
                    ...(p.invoiceId ? [{ id: p.invoiceId }] : [])
                ]
            },
            select: { totalAmount: true, paidAmount: true }
        });

        const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0) || p.estimatedValue || 0;
        const totalCollected = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);

        // Chi phí mua hàng (COGS)
        const totalCogs = p.purchaseBills
            .filter(b => b.status !== 'CANCELLED')
            .reduce((s, b) => s + b.totalAmount, 0);

        // Chi phí trực tiếp & vận hành
        const totalExpenses = p.expenses
            .filter(e => e.status !== 'CANCELLED')
            .reduce((s, e) => s + e.amount, 0);

        const totalCost = totalCogs + totalExpenses;
        const grossProfit = totalRevenue - totalCost;
        const marginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;

        results.push({
            projectId: p.id,
            projectCode: p.code,
            projectName: p.name,
            customerName: p.customer?.name || 'Nội bộ',
            status: p.status,
            budget: p.budget,
            totalRevenue,
            totalCollected,
            totalCogs,
            totalExpenses,
            totalCost,
            grossProfit,
            marginPercent
        });
    }

    return results.sort((a, b) => b.grossProfit - a.grossProfit);
}

/**
 * 4. BẢNG CHỈ SỐ ĐIỀU HÀNH CẤP CAO (Executive Financial Metrics)
 */
export async function getExecutiveMetrics() {
    // 1. Tiền mặt & Quỹ
    const financeAccounts = await prisma.financeAccount.findMany({
        where: { isActive: true },
        select: { currentBalance: true }
    });
    const cashBalance = financeAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0);

    // 2. Phải thu khách hàng (Receivables)
    const unpaidInvoices = await prisma.salesInvoice.findMany({
        where: { status: { in: ['DRAFT', 'ISSUED', 'PARTIAL_PAID'] } },
        select: { totalAmount: true, paidAmount: true, date: true }
    });
    const totalReceivables = unpaidInvoices.reduce((s, i) => s + Math.max(0, i.totalAmount - (i.paidAmount || 0)), 0);

    // 3. Phải trả nhà cung cấp (Payables)
    const unpaidBills = await prisma.purchaseBill.findMany({
        where: { status: { in: ['DRAFT', 'APPROVED', 'PARTIAL_PAID'] } },
        select: { totalAmount: true, paidAmount: true, date: true }
    });
    const totalPayables = unpaidBills.reduce((s, b) => s + Math.max(0, b.totalAmount - (b.paidAmount || 0)), 0);

    // 4. Vốn lưu động ròng (Net Working Capital = Cash + Receivables - Payables)
    const netWorkingCapital = cashBalance + totalReceivables - totalPayables;

    // 5. Chi phí hoạt động trung bình tháng để tính Runway
    const now = new Date();
    const recentExpenses = await prisma.expense.findMany({
        where: {
            status: 'COMPLETED',
            date: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
        },
        select: { amount: true }
    });
    const monthlyBurnRate = recentExpenses.length > 0 
        ? Math.max(10000000, recentExpenses.reduce((s, e) => s + e.amount, 0) / 3)
        : 30000000;

    const runwayMonths = monthlyBurnRate > 0 ? Math.round((cashBalance / monthlyBurnRate) * 10) / 10 : 99;

    // 6. DSO (Days Sales Outstanding) ước tính
    const totalSales3Months = unpaidInvoices.reduce((s, i) => s + i.totalAmount, 0) || 1;
    const dsoDays = Math.round((totalReceivables / (totalSales3Months / 90)) * 10) / 10;

    return {
        cashBalance: Math.round(cashBalance),
        totalReceivables: Math.round(totalReceivables),
        totalPayables: Math.round(totalPayables),
        netWorkingCapital: Math.round(netWorkingCapital),
        monthlyBurnRate: Math.round(monthlyBurnRate),
        runwayMonths,
        dsoDays: isNaN(dsoDays) ? 0 : dsoDays
    };
}
