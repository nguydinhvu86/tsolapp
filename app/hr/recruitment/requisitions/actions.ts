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
                budget: data.budget,
                description: data.description,
                requirements: data.requirements,
                requesterId: session.user.id,
                approverId: data.approverId || null,
                status: "PENDING"
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
        if (!req) return { success: false, error: "Not found" };

        // Only approver or ADMIN can approve/reject
        if (['APPROVED', 'REJECTED'].includes(status)) {
            if (session.user.role !== 'ADMIN' && session.user.id !== req.approverId) {
                return { success: false, error: "Bạn không có quyền duyệt yêu cầu này!" };
            }
        }

        await prisma.jobRequisition.update({
            where: { id },
            data: { status }
        });

        revalidatePath('/hr/recruitment/requisitions');
        return { success: true };
    } catch (e: any) {
        console.error("Update Status Error:", e);
        return { success: false, error: e.message || "Failed to update status" };
    }
}
