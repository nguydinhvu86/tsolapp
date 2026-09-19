import { prisma } from '@/lib/prisma';

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
}

/**
 * Lưu một tệp đính kèm vào kho lưu trữ tập trung SystemAttachment
 */
export async function saveAttachment(data: CreateAttachmentInput) {
    return await prisma.systemAttachment.create({
        data: {
            fileName: data.fileName,
            fileUrl: data.fileUrl,
            fileType: data.fileType || detectFileType(data.fileName),
            fileSize: data.fileSize || 0,
            entityType: data.entityType,
            entityId: data.entityId,
            notes: data.notes || null,
            uploadedById: data.uploadedById || null,
        }
    });
}

/**
 * Lưu nhiều tệp đính kèm cùng lúc vào kho lưu trữ tập trung
 */
export async function saveMultipleAttachments(items: CreateAttachmentInput[]) {
    if (!items || items.length === 0) return [];
    
    const prepared = items.map(item => ({
        fileName: item.fileName,
        fileUrl: item.fileUrl,
        fileType: item.fileType || detectFileType(item.fileName),
        fileSize: item.fileSize || 0,
        entityType: item.entityType,
        entityId: item.entityId,
        notes: item.notes || null,
        uploadedById: item.uploadedById || null,
    }));

    return await prisma.$transaction(
        prepared.map(data => prisma.systemAttachment.create({ data }))
    );
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
 * Xóa an toàn một tệp đính kèm khỏi kho lưu trữ tập trung
 */
export async function deleteAttachment(attachmentId: string) {
    return await prisma.systemAttachment.delete({
        where: { id: attachmentId }
    });
}

/**
 * Nhận diện loại tệp dựa trên phần mở rộng file
 */
function detectFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return 'IMAGE';
    if (['pdf'].includes(ext)) return 'PDF';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return 'EXCEL';
    if (['doc', 'docx'].includes(ext)) return 'DOCX';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'VIDEO';
    if (['mp3', 'wav', 'aac'].includes(ext)) return 'AUDIO';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'ARCHIVE';
    return 'OTHER';
}
