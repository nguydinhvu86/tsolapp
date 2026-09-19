'use server'

import { prisma } from '@/lib/prisma';
import { createApprovalRequest, processApprovalStep, seedDefaultApprovalRules } from '@/lib/approval-workflow';

export async function fetchApprovalCenterData() {
    try {
        await seedDefaultApprovalRules();

        const [requests, rules] = await Promise.all([
            prisma.approvalRequest.findMany({
                include: {
                    requestedBy: { select: { id: true, name: true, email: true } },
                    stepLogs: {
                        include: {
                            approver: { select: { id: true, name: true } }
                        },
                        orderBy: { stepOrder: 'asc' }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.approvalRule.findMany({
                orderBy: [{ entityType: 'asc' }, { stepOrder: 'asc' }]
            })
        ]);

        return { success: true, requests, rules };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function submitNewApprovalRequest(data: {
    entityType: 'EXPENSE' | 'PURCHASE_BILL' | 'PURCHASE_PAYMENT' | 'CASH_TRANSACTION';
    entityId: string;
    title: string;
    amount: number;
    userId?: string;
}) {
    try {
        const result = await createApprovalRequest({
            entityType: data.entityType,
            entityId: data.entityId,
            title: data.title,
            requestedAmount: data.amount,
            requestedById: data.userId
        });
        return { success: true, result };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function handleApproveReject(data: {
    requestId: string;
    approverId?: string;
    decision: 'APPROVED' | 'REJECTED';
    notes?: string;
}) {
    try {
        const result = await processApprovalStep({
            requestId: data.requestId,
            approverId: data.approverId || '',
            action: data.decision === 'APPROVED' ? 'APPROVE' : 'REJECT',
            notes: data.notes
        });
        return { success: true, result };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

