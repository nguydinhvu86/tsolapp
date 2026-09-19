import { prisma } from '@/lib/prisma';

export type AuditEntityType = 
    | 'CUSTOMER' 
    | 'SUPPLIER' 
    | 'SALES_ESTIMATE' 
    | 'SALES_ORDER' 
    | 'SALES_INVOICE' 
    | 'SALES_PAYMENT' 
    | 'PURCHASE_ORDER' 
    | 'PURCHASE_BILL' 
    | 'PURCHASE_PAYMENT' 
    | 'CASH_TRANSACTION' 
    | 'EXPENSE' 
    | 'TASK' 
    | 'PROJECT' 
    | 'LEAD' 
    | 'PAYROLL' 
    | 'USER';

export type AuditActionType = 
    | 'CREATE' 
    | 'UPDATE' 
    | 'DELETE' 
    | 'STATUS_CHANGE' 
    | 'APPROVE' 
    | 'REJECT' 
    | 'CANCEL' 
    | 'ALLOCATE' 
    | 'SIGN_CUSTOMER' 
    | 'SIGN_COMPANY' 
    | 'EXPORT_PDF' 
    | 'SEND_EMAIL';

export interface LogActivityInput {
    entityType: AuditEntityType;
    entityId: string;
    userId?: string | null;
    action: AuditActionType | string;
    details?: string | null;
    oldData?: any;
    newData?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
}

/**
 * Ghi vết một hoạt động nghiệp vụ vào UnifiedActivityLog
 * Tự động chuẩn hóa dữ liệu trước và sau thay đổi thành chuỗi JSON
 */
export async function logUnifiedActivity(input: LogActivityInput) {
    try {
        const oldDataStr = input.oldData ? (typeof input.oldData === 'string' ? input.oldData : JSON.stringify(input.oldData)) : null;
        const newDataStr = input.newData ? (typeof input.newData === 'string' ? input.newData : JSON.stringify(input.newData)) : null;

        return await prisma.unifiedActivityLog.create({
            data: {
                entityType: input.entityType,
                entityId: input.entityId,
                userId: input.userId || null,
                action: input.action,
                details: input.details || null,
                oldData: oldDataStr,
                newData: newDataStr,
                ipAddress: input.ipAddress || null,
                userAgent: input.userAgent || null,
            }
        });
    } catch (err) {
        console.error('Lỗi khi ghi UnifiedActivityLog:', err);
        return null;
    }
}

/**
 * Truy vấn nhật ký hoạt động theo thực thể
 */
export async function getUnifiedActivityLogs(entityType: AuditEntityType, entityId: string, limit: number = 50) {
    return await prisma.unifiedActivityLog.findMany({
        where: {
            entityType,
            entityId
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    role: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: limit
    });
}
