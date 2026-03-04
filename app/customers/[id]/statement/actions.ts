'use server'

import { prisma } from '@/lib/prisma';
import { endOfDay, startOfDay, subDays } from 'date-fns';

export interface StatementTransaction {
    id: string;
    date: Date;
    code: string;
    type: 'INVOICE' | 'PAYMENT';
    description: string;
    debit: number; // Phát sinh nợ (Hóa đơn)
    credit: number; // Thanh toán (Có)
    runningBalance: number; // Tồn cuối sau giao dịch
}

export interface StatementSummary {
    openingBalance: number;
    invoicedAmount: number;
    paidAmount: number;
    closingBalance: number;
    hasError?: boolean;
    error?: string;
}

export async function getCustomerStatement(customerId: string, startDateStr: string, endDateStr: string) {
    try {
        const startDate = startOfDay(new Date(startDateStr));
        const endDate = endOfDay(new Date(endDateStr));

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Invalid date range');
        }

        // 1. Calculate Opening Balance (Khách hàng nợ ban đầu)
        // Opening Balance = Total Invoiced (trước startDate) - Total Paid (trước startDate)
        const pastInvoices = await prisma.salesInvoice.aggregate({
            where: {
                customerId,
                status: { in: ['ISSUED', 'PARTIAL_PAID', 'PAID'] },
                date: { lt: startDate }
            },
            _sum: { totalAmount: true }
        });

        const pastPayments = await prisma.salesPayment.aggregate({
            where: {
                customerId,
                status: 'COMPLETED',
                date: { lt: startDate }
            },
            _sum: { amount: true }
        });

        const openingBalance = (pastInvoices._sum.totalAmount || 0) - (pastPayments._sum.amount || 0);

        // 2. Fetch Period Transactions (Giao dịch trong kỳ)
        const periodInvoices = await prisma.salesInvoice.findMany({
            where: {
                customerId,
                status: { in: ['ISSUED', 'PARTIAL_PAID', 'PAID'] },
                date: { gte: startDate, lte: endDate }
            },
            select: { id: true, code: true, date: true, notes: true, totalAmount: true },
            orderBy: { date: 'asc' }
        });

        const periodPayments = await prisma.salesPayment.findMany({
            where: {
                customerId,
                status: 'COMPLETED',
                date: { gte: startDate, lte: endDate }
            },
            select: { id: true, code: true, date: true, notes: true, amount: true },
            orderBy: { date: 'asc' }
        });

        // 3. Format and Merge Transactions
        let transactions: StatementTransaction[] = [];
        let invoicedAmount = 0;
        let paidAmount = 0;

        periodInvoices.forEach(inv => {
            invoicedAmount += inv.totalAmount;
            transactions.push({
                id: inv.id,
                date: inv.date,
                code: inv.code,
                type: 'INVOICE',
                description: inv.notes || 'Hóa đơn bán hàng',
                debit: inv.totalAmount,
                credit: 0,
                runningBalance: 0 // Will calculate later
            });
        });

        periodPayments.forEach(pay => {
            paidAmount += pay.amount;
            transactions.push({
                id: pay.id,
                date: pay.date,
                code: pay.code,
                type: 'PAYMENT',
                description: pay.notes || 'Thanh toán từ khách hàng',
                debit: 0,
                credit: pay.amount,
                runningBalance: 0 // Will calculate later
            });
        });

        // 4. Sort and Calculate Running Balance
        // Sort chronologically
        transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

        let currentBalance = openingBalance;
        transactions = transactions.map(tx => {
            currentBalance += tx.debit; // Add invoice (Nợ tăng)
            currentBalance -= tx.credit; // Subtract payment (Nợ giảm)
            return {
                ...tx,
                runningBalance: currentBalance
            };
        });

        const summary: StatementSummary = {
            openingBalance,
            invoicedAmount,
            paidAmount,
            closingBalance: currentBalance
        };

        return {
            success: true,
            summary,
            transactions
        };

    } catch (e: any) {
        console.error("Error fetching customer statement:", e);
        return { success: false, summary: null as any, transactions: [], error: e.message };
    }
}
