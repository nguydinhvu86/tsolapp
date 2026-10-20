import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export type EntityAttachmentType = 
    | 'SALES_INVOICE' 
    | 'SALES_ESTIMATE' 
    | 'SALES_ORDER' 
    | 'SALES_PAYMENT' 
    | 'PURCHASE_BILL' 
    | 'PURCHASE_ORDER' 
    | 'PURCHASE_PAYMENT' 
    | 'EXPENSE' 
    | 'CASH_TRANSACTION' 
    | 'TASK' 
    | 'CUSTOMER' 
    | 'SUPPLIER' 
    | 'PROJECT' 
    | 'LEAD';

export interface CreateAttachmentInput {
    fileName: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
    entityType: EntityAttachmentType;
    entityId: string;
    notes?: string;
    uploadedById?: string;
    createdAt?: Date;
}

/**
 * Nhận diện dung lượng tệp từ ổ đĩa nếu có
 */
export function getLocalFileSize(fileUrl: string): number {
    try {
        if (!fileUrl) return 0;
        const basename = path.basename(fileUrl.split('?')[0]);
        const p1 = path.join(process.cwd(), 'uploads_data', 'documents', basename);
        if (fs.existsSync(p1)) return fs.statSync(p1).size;
        const p2 = path.join(process.cwd(), 'public', 'uploads', 'documents', basename);
        if (fs.existsSync(p2)) return fs.statSync(p2).size;
    } catch (_) {}
    return 0;
}

/**
 * Nhận diện loại tệp dựa trên phần mở rộng file
 */
export function detectFileType(fileName: string): string {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return 'IMAGE';
    if (['pdf'].includes(ext)) return 'PDF';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return 'EXCEL';
    if (['doc', 'docx'].includes(ext)) return 'DOCX';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'VIDEO';
    if (['mp3', 'wav', 'aac'].includes(ext)) return 'AUDIO';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'ARCHIVE';
    return 'OTHER';
}

/**
 * Phân tích chuỗi đính kèm (có thể là JSON mảng, JSON object, hoặc URL đơn lẻ)
 */
export function parseAttachmentString(attachmentField: any): { url: string; name: string; uploadedAt?: string }[] {
    if (!attachmentField || typeof attachmentField !== 'string') return [];
    const trimmed = attachmentField.trim();
    if (!trimmed) return [];
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return parsed.map(item => {
                if (typeof item === 'string' && item.trim()) return { url: item.trim(), name: path.basename(item.trim()) };
                if (item && item.url && item.url.trim()) return { url: item.url.trim(), name: item.name || path.basename(item.url.trim()), uploadedAt: item.uploadedAt };
                return null;
            }).filter(Boolean) as { url: string; name: string; uploadedAt?: string }[];
        }
        if (parsed && parsed.url && parsed.url.trim()) {
            return [{ url: parsed.url.trim(), name: parsed.name || path.basename(parsed.url.trim()) }];
        }
    } catch (_) {}
    return [{ url: trimmed, name: path.basename(trimmed) }];
}

/**
 * Lưu hoặc cập nhật một tệp đính kèm vào kho lưu trữ tập trung SystemAttachment (an toàn, không trùng lặp)
 */
export async function saveAttachment(data: CreateAttachmentInput) {
    if (!data.fileUrl || !data.fileUrl.trim()) return null;
    try {
        const fileUrl = data.fileUrl.trim();
        const fileName = data.fileName?.trim() || path.basename(fileUrl);
        const fileType = data.fileType || detectFileType(fileName);
        const fileSize = (data.fileSize && data.fileSize > 0) ? data.fileSize : getLocalFileSize(fileUrl);

        const existing = await prisma.systemAttachment.findFirst({
            where: {
                entityType: data.entityType,
                entityId: data.entityId,
                fileUrl
            }
        });

        if (existing) {
            if ((!existing.fileSize || existing.fileSize === 0) && fileSize > 0) {
                return await prisma.systemAttachment.update({
                    where: { id: existing.id },
                    data: { fileSize }
                });
            }
            return existing;
        }

        return await prisma.systemAttachment.create({
            data: {
                fileName,
                fileUrl,
                fileType,
                fileSize,
                entityType: data.entityType,
                entityId: data.entityId,
                notes: data.notes || null,
                uploadedById: data.uploadedById || null,
                ...(data.createdAt ? { createdAt: data.createdAt } : {})
            }
        });
    } catch (err) {
        console.error('Lỗi khi lưu tệp vào SystemAttachment:', err);
        return null;
    }
}

/**
 * Lưu nhiều tệp đính kèm cùng lúc vào kho lưu trữ tập trung
 */
export async function saveMultipleAttachments(items: CreateAttachmentInput[]) {
    if (!items || items.length === 0) return [];
    const results = [];
    for (const item of items) {
        const res = await saveAttachment(item);
        if (res) results.push(res);
    }
    return results;
}

/**
 * Xóa an toàn một tệp đính kèm theo entityType, entityId và fileUrl
 */
export async function deleteAttachmentByUrl(entityType: EntityAttachmentType, entityId: string, fileUrl: string) {
    if (!fileUrl) return null;
    try {
        const existing = await prisma.systemAttachment.findFirst({
            where: {
                entityType,
                entityId,
                fileUrl: fileUrl.trim()
            }
        });
        if (existing) {
            return await prisma.systemAttachment.delete({
                where: { id: existing.id }
            });
        }
    } catch (err) {
        console.error('Lỗi khi xóa tệp khỏi SystemAttachment:', err);
    }
    return null;
}

/**
 * Lấy danh sách tệp đính kèm theo loại thực thể và ID thực thể
 */
export async function getAttachmentsByEntity(entityType: EntityAttachmentType, entityId: string) {
    return await prisma.systemAttachment.findMany({
        where: {
            entityType,
            entityId
        },
        include: {
            uploadedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

/**
 * Xóa an toàn một tệp đính kèm khỏi kho lưu trữ tập trung theo ID bản ghi
 */
export async function deleteAttachment(attachmentId: string) {
    return await prisma.systemAttachment.delete({
        where: { id: attachmentId }
    });
}

/**
 * Quét toàn bộ CSDL và đồng bộ tất cả tệp đính kèm chưa có trong SystemAttachment
 */
export async function syncAllVaultAttachments() {
    let inserted = 0;
    let updatedSize = 0;

    // 1. TaskAttachment
    const taskAtts = await prisma.taskAttachment.findMany({
        select: { id: true, fileName: true, fileUrl: true, fileType: true, taskId: true, uploadedById: true, createdAt: true }
    });
    for (const ta of taskAtts) {
        if (!ta.fileUrl || !ta.fileUrl.trim()) continue;
        const exists = await prisma.systemAttachment.findFirst({
            where: { entityType: 'TASK', entityId: ta.taskId, fileUrl: ta.fileUrl.trim() }
        });
        const size = getLocalFileSize(ta.fileUrl);
        if (!exists) {
            await prisma.systemAttachment.create({
                data: {
                    entityType: 'TASK',
                    entityId: ta.taskId,
                    fileName: ta.fileName || path.basename(ta.fileUrl),
                    fileUrl: ta.fileUrl.trim(),
                    fileType: ta.fileType || detectFileType(ta.fileName || ta.fileUrl),
                    fileSize: size,
                    uploadedById: ta.uploadedById || null,
                    createdAt: ta.createdAt
                }
            });
            inserted++;
        } else if ((!exists.fileSize || exists.fileSize === 0) && size > 0) {
            await prisma.systemAttachment.update({
                where: { id: exists.id },
                data: { fileSize: size }
            });
            updatedSize++;
        }
    }

    // 2. PurchaseBill
    const bills = await prisma.purchaseBill.findMany({
        where: { attachment: { not: null } },
        select: { id: true, code: true, attachment: true, creatorId: true, createdAt: true }
    });
    for (const b of bills) {
        const files = parseAttachmentString(b.attachment);
        for (const f of files) {
            if (!f.url || !f.url.trim()) continue;
            const exists = await prisma.systemAttachment.findFirst({
                where: { entityType: 'PURCHASE_BILL', entityId: b.id, fileUrl: f.url.trim() }
            });
            const size = getLocalFileSize(f.url);
            if (!exists) {
                await prisma.systemAttachment.create({
                    data: {
                        entityType: 'PURCHASE_BILL',
                        entityId: b.id,
                        fileName: f.name || path.basename(f.url),
                        fileUrl: f.url.trim(),
                        fileType: detectFileType(f.name || f.url),
                        fileSize: size,
                        uploadedById: b.creatorId || null,
                        createdAt: f.uploadedAt ? new Date(f.uploadedAt) : b.createdAt
                    }
                });
                inserted++;
            } else if ((!exists.fileSize || exists.fileSize === 0) && size > 0) {
                await prisma.systemAttachment.update({
                    where: { id: exists.id },
                    data: { fileSize: size }
                });
                updatedSize++;
            }
        }
    }

    // 3. PurchasePayment
    const pps = await prisma.purchasePayment.findMany({
        where: { attachment: { not: null } },
        select: { id: true, code: true, attachment: true, creatorId: true, createdAt: true }
    });
    for (const p of pps) {
        const files = parseAttachmentString(p.attachment);
        for (const f of files) {
            if (!f.url || !f.url.trim()) continue;
            const exists = await prisma.systemAttachment.findFirst({
                where: { entityType: 'PURCHASE_PAYMENT', entityId: p.id, fileUrl: f.url.trim() }
            });
            const size = getLocalFileSize(f.url);
            if (!exists) {
                await prisma.systemAttachment.create({
                    data: {
                        entityType: 'PURCHASE_PAYMENT',
                        entityId: p.id,
                        fileName: f.name || path.basename(f.url),
                        fileUrl: f.url.trim(),
                        fileType: detectFileType(f.name || f.url),
                        fileSize: size,
                        uploadedById: p.creatorId || null,
                        createdAt: f.uploadedAt ? new Date(f.uploadedAt) : p.createdAt
                    }
                });
                inserted++;
            } else if ((!exists.fileSize || exists.fileSize === 0) && size > 0) {
                await prisma.systemAttachment.update({
                    where: { id: exists.id },
                    data: { fileSize: size }
                });
                updatedSize++;
            }
        }
    }

    // 4. SalesPayment
    const sps = await prisma.salesPayment.findMany({
        where: { attachment: { not: null } },
        select: { id: true, code: true, attachment: true, creatorId: true, createdAt: true }
    });
    for (const s of sps) {
        const files = parseAttachmentString(s.attachment);
        for (const f of files) {
            if (!f.url || !f.url.trim()) continue;
            const exists = await prisma.systemAttachment.findFirst({
                where: { entityType: 'SALES_PAYMENT', entityId: s.id, fileUrl: f.url.trim() }
            });
            const size = getLocalFileSize(f.url);
            if (!exists) {
                await prisma.systemAttachment.create({
                    data: {
                        entityType: 'SALES_PAYMENT',
                        entityId: s.id,
                        fileName: f.name || path.basename(f.url),
                        fileUrl: f.url.trim(),
                        fileType: detectFileType(f.name || f.url),
                        fileSize: size,
                        uploadedById: s.creatorId || null,
                        createdAt: f.uploadedAt ? new Date(f.uploadedAt) : s.createdAt
                    }
                });
                inserted++;
            } else if ((!exists.fileSize || exists.fileSize === 0) && size > 0) {
                await prisma.systemAttachment.update({
                    where: { id: exists.id },
                    data: { fileSize: size }
                });
                updatedSize++;
            }
        }
    }

    // 5. Expense
    const exps = await prisma.expense.findMany({
        where: { attachment: { not: null } },
        select: { id: true, code: true, attachment: true, creatorId: true, createdAt: true }
    });
    for (const e of exps) {
        const files = parseAttachmentString(e.attachment);
        for (const f of files) {
            if (!f.url || !f.url.trim()) continue;
            const exists = await prisma.systemAttachment.findFirst({
                where: { entityType: 'EXPENSE', entityId: e.id, fileUrl: f.url.trim() }
            });
            const size = getLocalFileSize(f.url);
            if (!exists) {
                await prisma.systemAttachment.create({
                    data: {
                        entityType: 'EXPENSE',
                        entityId: e.id,
                        fileName: f.name || path.basename(f.url),
                        fileUrl: f.url.trim(),
                        fileType: detectFileType(f.name || f.url),
                        fileSize: size,
                        uploadedById: e.creatorId || null,
                        createdAt: f.uploadedAt ? new Date(f.uploadedAt) : e.createdAt
                    }
                });
                inserted++;
            } else if ((!exists.fileSize || exists.fileSize === 0) && size > 0) {
                await prisma.systemAttachment.update({
                    where: { id: exists.id },
                    data: { fileSize: size }
                });
                updatedSize++;
            }
        }
    }

    // 6. CustomerNote
    const cns = await prisma.customerNote.findMany({
        where: { attachment: { not: null } },
        select: { id: true, customerId: true, attachment: true, userId: true, createdAt: true }
    });
    for (const cn of cns) {
        const files = parseAttachmentString(cn.attachment);
        for (const f of files) {
            if (!f.url || !f.url.trim()) continue;
            const exists = await prisma.systemAttachment.findFirst({
                where: { entityType: 'CUSTOMER', entityId: cn.customerId, fileUrl: f.url.trim() }
            });
            const size = getLocalFileSize(f.url);
            if (!exists) {
                await prisma.systemAttachment.create({
                    data: {
                        entityType: 'CUSTOMER',
                        entityId: cn.customerId,
                        fileName: f.name || path.basename(f.url),
                        fileUrl: f.url.trim(),
                        fileType: detectFileType(f.name || f.url),
                        fileSize: size,
                        uploadedById: cn.userId || null,
                        createdAt: cn.createdAt
                    }
                });
                inserted++;
            } else if ((!exists.fileSize || exists.fileSize === 0) && size > 0) {
                await prisma.systemAttachment.update({
                    where: { id: exists.id },
                    data: { fileSize: size }
                });
                updatedSize++;
            }
        }
    }

    // 7. LeadNote
    const lns = await prisma.leadNote.findMany({
        where: { attachment: { not: null } },
        select: { id: true, leadId: true, attachment: true, userId: true, createdAt: true }
    });
    for (const ln of lns) {
        const files = parseAttachmentString(ln.attachment);
        for (const f of files) {
            if (!f.url || !f.url.trim()) continue;
            const exists = await prisma.systemAttachment.findFirst({
                where: { entityType: 'LEAD', entityId: ln.leadId, fileUrl: f.url.trim() }
            });
            const size = getLocalFileSize(f.url);
            if (!exists) {
                await prisma.systemAttachment.create({
                    data: {
                        entityType: 'LEAD',
                        entityId: ln.leadId,
                        fileName: f.name || path.basename(f.url),
                        fileUrl: f.url.trim(),
                        fileType: detectFileType(f.name || f.url),
                        fileSize: size,
                        uploadedById: ln.userId || null,
                        createdAt: ln.createdAt
                    }
                });
                inserted++;
            } else if ((!exists.fileSize || exists.fileSize === 0) && size > 0) {
                await prisma.systemAttachment.update({
                    where: { id: exists.id },
                    data: { fileSize: size }
                });
                updatedSize++;
            }
        }
    }

    const total = await prisma.systemAttachment.count();
    const sizeAgg = await prisma.systemAttachment.aggregate({ _sum: { fileSize: true } });

    return {
        inserted,
        updatedSize,
        total,
        totalSize: sizeAgg._sum.fileSize || 0
    };
}
