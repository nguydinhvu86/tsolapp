import { prisma } from '@/lib/prisma';
import { Quote, Contract, Handover, PaymentRequest, ContractAppendix, Dispatch } from '@prisma/client';

export async function getDashboardStats() {
    try {
        const [
            quotes,
            contracts,
            handovers,
            payments,
            appendices,
            dispatches
        ] = await Promise.all([
            prisma.quote.findMany({ select: { id: true, status: true, createdAt: true } }),
            prisma.contract.findMany({ select: { id: true, status: true, createdAt: true } }),
            prisma.handover.findMany({ select: { id: true, status: true, createdAt: true } }),
            prisma.paymentRequest.findMany({ select: { id: true, status: true, createdAt: true } }),
            prisma.contractAppendix.findMany({ select: { id: true, status: true, createdAt: true } }),
            prisma.dispatch.findMany({ select: { id: true, status: true, createdAt: true } })
        ]);

        const totalQuotes = quotes.length;
        const totalContracts = contracts.length;
        const totalHandovers = handovers.length;
        const totalPayments = payments.length;
        const totalAppendices = appendices.length;
        const totalDispatches = dispatches.length;

        // Basic aggregation for "Active" vs "Closed"
        const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED').length;
        const signedContracts = contracts.filter(c => c.status === 'SIGNED').length;

        return {
            totalQuotes,
            acceptedQuotes,
            totalContracts,
            signedContracts,
            totalHandovers,
            totalPayments,
            totalAppendices,
            totalDispatches,
            // Pass raw arrays for client-side chart processing if needed, 
            // but usually we aggregate on server. For this scale, passing lightweight arrays is okay.
            recentActivity: {
                quotes: quotes.slice(-100),
                contracts: contracts.slice(-100),
                handovers: handovers.slice(-100),
                payments: payments.slice(-100),
                appendices: appendices.slice(-100),
                dispatches: dispatches.slice(-100)
            }
        };
    } catch (e) {
        console.error("Dashboard stats error", e);
        return null;
    }
}
