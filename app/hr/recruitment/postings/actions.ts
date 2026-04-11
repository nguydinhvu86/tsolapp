'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifyActionPermission } from "@/lib/permissions";

export async function createJobPosting(data: {
    title: string;
    requisitionId: string;
    content: string;
    channels: string;
}) {
    try {
        const user = await verifyActionPermission('RECRUITMENT_MANAGE');

        const posting = await prisma.jobPosting.create({
            data: {
                title: data.title,
                requisitionId: data.requisitionId,
                content: data.content,
                channels: data.channels,
                status: "DRAFT",
                posterId: (user as any).id
            },
            include: {
                requisition: { select: { id: true, code: true, title: true, department: true } },
                poster: { select: { name: true, email: true } }
            }
        });

        revalidatePath('/hr/recruitment/postings');
        return { success: true, data: posting };
    } catch (e: any) {
        console.error("Create Posting Error:", e);
        return { success: false, error: e.message || "Lỗi tạo tin tuyển dụng" };
    }
}

export async function updatePostingStatus(id: string, status: string) {
    try {
        await verifyActionPermission('RECRUITMENT_MANAGE');

        await prisma.jobPosting.update({
            where: { id },
            data: { status }
        });

        revalidatePath('/hr/recruitment/postings');
        return { success: true };
    } catch (e: any) {
        console.error("Update Status Error:", e);
        return { success: false, error: e.message || "Lỗi cập nhật trạng thái tin" };
    }
}
