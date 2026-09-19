const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillUnifiedStorage() {
    console.log('--- ĐANG ĐỒNG BỘ DỮ LIỆU ĐÍNH KÈM VÀ AUDIT LOG TẬP TRUNG (NON-DESTRUCTIVE) ---\n');

    let attachmentsCopied = 0;
    let logsCopied = 0;

    // 1. Đồng bộ tệp đính kèm từ SalesInvoice
    const invoices = await prisma.salesInvoice.findMany({
        where: { attachment: { not: null } },
        select: { id: true, code: true, attachment: true, creatorId: true, createdAt: true }
    });
    for (const inv of invoices) {
        if (!inv.attachment) continue;
        let files = [];
        try {
            files = JSON.parse(inv.attachment);
            if (!Array.isArray(files)) files = [inv.attachment];
        } catch {
            files = [inv.attachment];
        }

        for (const fileUrl of files) {
            if (typeof fileUrl !== 'string' || !fileUrl.trim()) continue;
            const fileName = fileUrl.split('/').pop() || `Invoice_${inv.code}_file`;
            const exists = await prisma.systemAttachment.findFirst({
                where: { entityType: 'SALES_INVOICE', entityId: inv.id, fileUrl }
            });
            if (!exists) {
                await prisma.systemAttachment.create({
                    data: {
                        fileName,
                        fileUrl,
                        fileType: fileName.endsWith('.pdf') ? 'PDF' : 'IMAGE',
                        entityType: 'SALES_INVOICE',
                        entityId: inv.id,
                        uploadedById: inv.creatorId || null,
                        createdAt: inv.createdAt
                    }
                });
                attachmentsCopied++;
            }
        }
    }

    // 2. Đồng bộ tệp đính kèm từ PurchaseBill
    const bills = await prisma.purchaseBill.findMany({
        where: { attachment: { not: null } },
        select: { id: true, code: true, attachment: true, creatorId: true, createdAt: true }
    });
    for (const bill of bills) {
        if (!bill.attachment) continue;
        let files = [];
        try {
            files = JSON.parse(bill.attachment);
            if (!Array.isArray(files)) files = [bill.attachment];
        } catch {
            files = [bill.attachment];
        }

        for (const fileUrl of files) {
            if (typeof fileUrl !== 'string' || !fileUrl.trim()) continue;
            const fileName = fileUrl.split('/').pop() || `Bill_${bill.code}_file`;
            const exists = await prisma.systemAttachment.findFirst({
                where: { entityType: 'PURCHASE_BILL', entityId: bill.id, fileUrl }
            });
            if (!exists) {
                await prisma.systemAttachment.create({
                    data: {
                        fileName,
                        fileUrl,
                        fileType: fileName.endsWith('.pdf') ? 'PDF' : 'IMAGE',
                        entityType: 'PURCHASE_BILL',
                        entityId: bill.id,
                        uploadedById: bill.creatorId || null,
                        createdAt: bill.createdAt
                    }
                });
                attachmentsCopied++;
            }
        }
    }

    // 3. Đồng bộ tệp đính kèm từ TaskAttachment
    const taskAttachments = await prisma.taskAttachment.findMany({
        select: { id: true, fileName: true, fileUrl: true, fileType: true, taskId: true, uploadedById: true, createdAt: true }
    });
    for (const ta of taskAttachments) {
        const exists = await prisma.systemAttachment.findFirst({
            where: { entityType: 'TASK', entityId: ta.taskId, fileUrl: ta.fileUrl }
        });
        if (!exists) {
            await prisma.systemAttachment.create({
                data: {
                    fileName: ta.fileName,
                    fileUrl: ta.fileUrl,
                    fileType: ta.fileType || 'OTHER',
                    entityType: 'TASK',
                    entityId: ta.taskId,
                    uploadedById: ta.uploadedById,
                    createdAt: ta.createdAt
                }
            });
            attachmentsCopied++;
        }
    }

    // 4. Đồng bộ Activity Logs từ SalesInvoiceActivityLog
    const invoiceLogs = await prisma.salesInvoiceActivityLog.findMany({
        select: { id: true, invoiceId: true, userId: true, action: true, details: true, createdAt: true }
    });
    for (const ilog of invoiceLogs) {
        const exists = await prisma.unifiedActivityLog.findFirst({
            where: { entityType: 'SALES_INVOICE', entityId: ilog.invoiceId, action: ilog.action, createdAt: ilog.createdAt }
        });
        if (!exists) {
            await prisma.unifiedActivityLog.create({
                data: {
                    entityType: 'SALES_INVOICE',
                    entityId: ilog.invoiceId,
                    userId: ilog.userId,
                    action: ilog.action,
                    details: ilog.details,
                    createdAt: ilog.createdAt
                }
            });
            logsCopied++;
        }
    }

    console.log(`✅ Hoàn tất đồng bộ an toàn:`);
    console.log(`- Đã sao chép ${attachmentsCopied} tệp đính kèm vào SystemAttachment.`);
    console.log(`- Đã sao chép ${logsCopied} nhật ký vào UnifiedActivityLog.`);
    console.log(`- Dữ liệu gốc ở các bảng cũ vẫn bảo toàn 100% nguyên vẹn.\n`);
}

module.exports = { backfillUnifiedStorage };

if (require.main === module) {
    backfillUnifiedStorage()
        .catch(console.error)
        .finally(() => prisma.$disconnect());
}
