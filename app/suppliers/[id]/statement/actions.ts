'use server'

import { prisma } from '@/lib/prisma';
import { endOfDay, startOfDay, subDays } from 'date-fns';

export interface SupplierStatementTransaction {
    id: string;
    date: Date;
    code: string;
    type: 'BILL' | 'PAYMENT';
    description: string;
    debit: number; // Phát sinh tang no (Hóa đơn mua hàng)
    credit: number; // Thanh toán giam no (Có)
    runningBalance: number; // Tồn cuối sau giao dịch
}

export interface SupplierStatementSummary {
    openingBalance: number;
    billedAmount: number;
    paidAmount: number;
    closingBalance: number;
    hasError?: boolean;
    error?: string;
}

export async function getSupplierStatement(supplierId: string, startDateStr: string, endDateStr: string) {
    try {
        const startDate = startOfDay(new Date(startDateStr));
        const endDate = endOfDay(new Date(endDateStr));

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Invalid date range');
        }

        // 1. Calculate Opening Balance (Công ty nợ Nhà cung cấp ban đầu)
        // Opening Balance = Total Billed (trước startDate) - Total Paid (trước startDate)
        const pastBills = await prisma.purchaseBill.aggregate({
            where: {
                supplierId,
                status: { in: ['APPROVED', 'PARTIAL_PAID', 'PAID'] },
                date: { lt: startDate }
            },
            _sum: { totalAmount: true }
        });

        const pastPayments = await prisma.purchasePayment.aggregate({
            where: {
                supplierId,
                date: { lt: startDate }
            },
            _sum: { amount: true }
        });

        const openingBalance = (pastBills._sum.totalAmount || 0) - (pastPayments._sum.amount || 0);

        // 2. Fetch Period Transactions (Giao dịch trong kỳ)
        const periodBills = await prisma.purchaseBill.findMany({
            where: {
                supplierId,
                status: { in: ['APPROVED', 'PARTIAL_PAID', 'PAID'] },
                date: { gte: startDate, lte: endDate }
            },
            select: { id: true, code: true, supplierInvoice: true, date: true, notes: true, totalAmount: true },
            orderBy: { date: 'asc' }
        });

        const periodPayments = await prisma.purchasePayment.findMany({
            where: {
                supplierId,
                date: { gte: startDate, lte: endDate }
            },
            select: { id: true, code: true, date: true, notes: true, amount: true },
            orderBy: { date: 'asc' }
        });

        // 3. Format and Merge Transactions
        let transactions: SupplierStatementTransaction[] = [];
        let billedAmount = 0;
        let paidAmount = 0;

        periodBills.forEach(bill => {
            billedAmount += bill.totalAmount;
            transactions.push({
                id: bill.id,
                date: bill.date,
                code: bill.supplierInvoice || bill.code,
                type: 'BILL',
                description: bill.notes || 'Hóa đơn mua hàng',
                debit: bill.totalAmount,
                credit: 0,
                runningBalance: 0
            });
        });

        periodPayments.forEach(pay => {
            paidAmount += pay.amount;
            transactions.push({
                id: pay.id,
                date: pay.date,
                code: pay.code,
                type: 'PAYMENT',
                description: pay.notes || 'Thanh toán cho nhà cung cấp',
                debit: 0,
                credit: pay.amount,
                runningBalance: 0
            });
        });

        // 4. Sort and Calculate Running Balance
        transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

        let currentBalance = openingBalance;
        transactions = transactions.map(tx => {
            currentBalance += tx.debit; // Add bill (Nợ tăng)
            currentBalance -= tx.credit; // Subtract payment (Nợ giảm)
            return {
                ...tx,
                runningBalance: currentBalance
            };
        });

        const summary: SupplierStatementSummary = {
            openingBalance,
            billedAmount,
            paidAmount,
            closingBalance: currentBalance
        };

        return {
            success: true,
            summary,
            transactions
        };

    } catch (e: any) {
        console.error("Error fetching supplier statement:", e);
        return { success: false, summary: null as any, transactions: [], error: e.message };
    }
}
