import { prisma } from '@/lib/prisma';

export interface CreateApprovalRequestInput {
    entityType: 'EXPENSE' | 'PURCHASE_BILL' | 'PURCHASE_PAYMENT' | 'CASH_TRANSACTION';
    entityId: string;
    title: string;
    requestedAmount: number;
    requestedById?: string;
}

export interface ProcessStepInput {
    requestId: string;
    approverId: string;
    action: 'APPROVE' | 'REJECT';
    notes?: string;
}

/**
 * Khởi tạo cấu hình quy tắc duyệt mặc định theo hạn mức tài chính
 */
export async function seedDefaultApprovalRules() {
    const rules = [
        // Chi tiêu / Mua hàng < 10 triệu: 1 Cấp (MANAGER)
        { entityType: 'EXPENSE', name: 'Chi tiêu định mức nhỏ (< 10tr)', minAmount: 0, maxAmount: 10000000, requiredRole: 'MANAGER', stepOrder: 1 },
        // Chi tiêu từ 10tr đến 50tr: 2 Cấp (MANAGER -> CFO)
        { entityType: 'EXPENSE', name: 'Chi tiêu trung bình (10tr - 50tr) - Cấp 1', minAmount: 10000000, maxAmount: 50000000, requiredRole: 'MANAGER', stepOrder: 1 },
        { entityType: 'EXPENSE', name: 'Chi tiêu trung bình (10tr - 50tr) - Cấp 2', minAmount: 10000000, maxAmount: 50000000, requiredRole: 'CFO', stepOrder: 2 },
        // Chi tiêu > 50 triệu: 3 Cấp (MANAGER -> CFO -> CEO)
        { entityType: 'EXPENSE', name: 'Chi tiêu lớn (> 50tr) - Cấp 1', minAmount: 50000000, maxAmount: null, requiredRole: 'MANAGER', stepOrder: 1 },
        { entityType: 'EXPENSE', name: 'Chi tiêu lớn (> 50tr) - Cấp 2', minAmount: 50000000, maxAmount: null, requiredRole: 'CFO', stepOrder: 2 },
        { entityType: 'EXPENSE', name: 'Chi tiêu lớn (> 50tr) - Cấp 3', minAmount: 50000000, maxAmount: null, requiredRole: 'CEO', stepOrder: 3 },
    ];

    for (const r of rules) {
        await prisma.approvalRule.create({
            data: {
                name: r.name,
                entityType: r.entityType,
                minAmount: r.minAmount,
                maxAmount: r.maxAmount,
                requiredRole: r.requiredRole,
                stepOrder: r.stepOrder,
                isEnabled: true
            }
        });
    }
}

/**
 * Tạo một yêu cầu phê duyệt dựa trên số tiền yêu cầu
 */
export async function createApprovalRequest(input: CreateApprovalRequestInput) {
    // Xác định số bước duyệt cần thiết dựa trên số tiền
    const matchingRules = await prisma.approvalRule.findMany({
        where: {
            entityType: input.entityType,
            isEnabled: true,
            minAmount: { lte: input.requestedAmount },
            OR: [
                { maxAmount: null },
                { maxAmount: { gte: input.requestedAmount } }
            ]
        },
        orderBy: { stepOrder: 'asc' }
    });

    const totalSteps = matchingRules.length > 0 ? matchingRules.length : 1;

    return await prisma.approvalRequest.create({
        data: {
            entityType: input.entityType,
            entityId: input.entityId,
            title: input.title,
            requestedAmount: input.requestedAmount,
            currentStep: 1,
            totalSteps,
            status: 'PENDING',
            requestedById: input.requestedById || null
        }
    });
}

/**
 * Xử lý duyệt hoặc từ chối tại bước hiện tại
 */
export async function processApprovalStep(input: ProcessStepInput) {
    const req = await prisma.approvalRequest.findUnique({
        where: { id: input.requestId }
    });

    if (!req) throw new Error('Không tìm thấy yêu cầu phê duyệt');
    if (req.status !== 'PENDING') throw new Error('Yêu cầu này đã được xử lý trước đó');

    // Ghi log bước duyệt
    await prisma.approvalStepLog.create({
        data: {
            requestId: req.id,
            stepOrder: req.currentStep,
            approverId: input.approverId,
            status: input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            notes: input.notes || null,
        }
    });

    if (input.action === 'REJECT') {
        // Từ chối ngay lập tức
        return await prisma.approvalRequest.update({
            where: { id: req.id },
            data: { status: 'REJECTED' }
        });
    }

    // Nếu duyệt
    if (req.currentStep >= req.totalSteps) {
        // Đã hoàn tất bước cuối cùng -> Duyệt thành công toàn bộ
        return await prisma.approvalRequest.update({
            where: { id: req.id },
            data: { status: 'APPROVED' }
        });
    } else {
        // Chuyển sang bước duyệt tiếp theo
        return await prisma.approvalRequest.update({
            where: { id: req.id },
            data: { currentStep: req.currentStep + 1 }
        });
    }
}
