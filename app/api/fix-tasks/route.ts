import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const tasks = await prisma.task.findMany({
            where: {
                OR: [
                    { customerId: null },
                    { supplierId: null }
                ]
            }
        });

        let updatedCount = 0;

        for (const task of tasks) {
            let newCustomerId = null;
            let newSupplierId = null;

            if (!task.customerId) {
                if (task.contractId) { const doc = await prisma.contract.findUnique({ where: { id: task.contractId }, select: { customerId: true } }); if (doc) newCustomerId = doc.customerId; }
                else if (task.quoteId) { const doc = await prisma.quote.findUnique({ where: { id: task.quoteId }, select: { customerId: true } }); if (doc) newCustomerId = doc.customerId; }
                else if (task.handoverId) { const doc = await prisma.handover.findUnique({ where: { id: task.handoverId }, select: { customerId: true } }); if (doc) newCustomerId = doc.customerId; }
                else if (task.paymentReqId) { const doc = await prisma.paymentRequest.findUnique({ where: { id: task.paymentReqId }, select: { customerId: true } }); if (doc) newCustomerId = doc.customerId; }
                else if (task.dispatchId) { const doc = await prisma.dispatch.findUnique({ where: { id: task.dispatchId }, select: { customerId: true } }); if (doc) newCustomerId = doc.customerId; }
                else if (task.salesOrderId) { const doc = await prisma.salesOrder.findUnique({ where: { id: task.salesOrderId }, select: { customerId: true } }); if (doc) newCustomerId = doc.customerId; }
                else if (task.salesInvoiceId) { const doc = await prisma.salesInvoice.findUnique({ where: { id: task.salesInvoiceId }, select: { customerId: true } }); if (doc) newCustomerId = doc.customerId; }
                else if (task.salesEstimateId) { const doc = await prisma.salesEstimate.findUnique({ where: { id: task.salesEstimateId }, select: { customerId: true } }); if (doc) newCustomerId = doc.customerId; }
                else if (task.salesPaymentId) { const doc = await prisma.salesPayment.findUnique({ where: { id: task.salesPaymentId }, select: { customerId: true } }); if (doc) newCustomerId = doc.customerId; }
                else if (task.leadId) { const doc = await prisma.lead.findUnique({ where: { id: task.leadId }, select: { customerId: true } }); if (doc && doc.customerId) newCustomerId = doc.customerId; }
            }

            if (!task.supplierId) {
                if (task.purchaseOrderId) { const doc = await prisma.purchaseOrder.findUnique({ where: { id: task.purchaseOrderId }, select: { supplierId: true } }); if (doc) newSupplierId = doc.supplierId; }
                else if (task.purchaseBillId) { const doc = await prisma.purchaseBill.findUnique({ where: { id: task.purchaseBillId }, select: { supplierId: true } }); if (doc) newSupplierId = doc.supplierId; }
                else if (task.purchasePaymentId) { const doc = await prisma.purchasePayment.findUnique({ where: { id: task.purchasePaymentId }, select: { supplierId: true } }); if (doc) newSupplierId = doc.supplierId; }
            }

            if (newCustomerId || newSupplierId) {
                await prisma.task.update({
                    where: { id: task.id },
                    data: {
                        ...(newCustomerId ? { customerId: newCustomerId } : {}),
                        ...(newSupplierId ? { supplierId: newSupplierId } : {})
                    }
                });
                updatedCount++;
            }
        }

        return NextResponse.json({ success: true, totalChecked: tasks.length, updatedCount });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
