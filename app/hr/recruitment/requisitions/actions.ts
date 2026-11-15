// @ts-nocheck
'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createRequisition(data: {
    title: string;
    department: string;
    headcount: number;
    budget: number | null;
    description: string;
    requirements: string;
    approverId?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        let code = `REQ-${Date.now().toString().slice(-6)}`;

        const newReq = await prisma.jobRequisition.create({
            data: {
                code,
                title: data.title,
                department: data.department,
                headcount: data.headcount,
                budget: data.budget ? Number(data.budget) : null,
                description: data.description,
                requirements: data.requirements,
                requesterId: session.user.id,
                approverId: data.approverId || null,
                status: "PENDING"
            },
            include: {
                requester: {
                    select: { id: true, name: true, email: true, avatar: true }
                },
                approver: {
                    select: { id: true, name: true, email: true, avatar: true }
                },
                _count: {
                    select: { jobPostings: true, applications: true }
                }
            }
        });

        revalidatePath('/hr/recruitment/requisitions');
        return { success: true, data: newReq };
    } catch (e: any) {
        console.error("Create Requisition Error:", e);
        return { success: false, error: e.message || "Failed to create requisition" };
    }
}

export async function updateRequisitionStatus(id: string, status: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const req = await prisma.jobRequisition.findUnique({ where: { id } });
        if (!req) return { success: false, error: "Không tìm thấy yêu cầu tuyển dụng!" };

        const isAdmin = session.user.role === 'ADMIN';
        const isAssignedApprover = session.user.id === req.approverId;
        const permissions = (session.user.permissions as string[] || []);
        const hasRecruitmentEdit = permissions.includes('RECRUITMENT_EDIT') || permissions.includes('HR_APPROVE');

        // Phê duyệt / Từ chối / Đóng: Kiểm tra quyền Ban Giám Đốc (ADMIN) hoặc người được phân công duyệt
        if (['APPROVED', 'REJECTED', 'CLOSED'].includes(status)) {
            if (!isAdmin && !isAssignedApprover && !hasRecruitmentEdit) {
                return { success: false, error: "Bạn không có quyền phê duyệt yêu cầu này! Chỉ Ban Giám Đốc hoặc người được chỉ định mới có quyền duyệt." };
            }
        }

        const updated = await prisma.jobRequisition.update({
            where: { id },
            data: { 
                status,
                // Tự động gán người duyệt nếu trước đó chưa gán và BGĐ duyệt
                approverId: req.approverId || session.user.id
            },
            include: {
                requester: {
                    select: { id: true, name: true, email: true, avatar: true }
                },
                approver: {
                    select: { id: true, name: true, email: true, avatar: true }
                },
                _count: {
                    select: { jobPostings: true, applications: true }
                }
            }
        });

        revalidatePath('/hr/recruitment/requisitions');
        return { success: true, data: updated };
    } catch (e: any) {
        console.error("Update Status Error:", e);
        return { success: false, error: e.message || "Failed to update status" };
    }
}

export async function deleteRequisition(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const req = await prisma.jobRequisition.findUnique({ where: { id } });
        if (!req) return { success: false, error: "Không tìm thấy yêu cầu tuyển dụng!" };

        const isAdmin = session.user.role === 'ADMIN';
        const isRequester = session.user.id === req.requesterId;

        if (!isAdmin && !isRequester) {
            return { success: false, error: "Bạn không có quyền xóa yêu cầu này!" };
        }

        await prisma.jobRequisition.delete({ where: { id } });
        revalidatePath('/hr/recruitment/requisitions');
        return { success: true };
    } catch (e: any) {
        console.error("Delete Requisition Error:", e);
        return { success: false, error: e.message || "Failed to delete requisition" };
    }
}
