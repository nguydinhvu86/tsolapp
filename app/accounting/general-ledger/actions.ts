'use server'

import { prisma } from '@/lib/prisma';
import { createJournalEntry, seedChartOfAccounts } from '@/lib/accounting-ledger';

export async function fetchGeneralLedgerData() {
    try {
        await seedChartOfAccounts();

        const [entries, accounts] = await Promise.all([
            prisma.journalEntry.findMany({
                include: {
                    lines: {
                        orderBy: { createdAt: 'asc' }
                    }
                },
                orderBy: { date: 'desc' }
            }),
            prisma.chartOfAccount.findMany({
                orderBy: { code: 'asc' }
            })
        ]);

        return { success: true, entries, accounts };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createManualJournalEntry(input: {
    description: string;
    lines: Array<{
        accountCode: string;
        debitAmount: number;
        creditAmount: number;
        description?: string;
    }>;
}) {
    try {
        const result = await createJournalEntry({
            description: input.description,
            refType: 'MANUAL',
            lines: input.lines
        });
        return { success: true, result };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
