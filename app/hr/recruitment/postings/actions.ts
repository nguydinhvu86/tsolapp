// @ts-nocheck
'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function verifyRecruitmentAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Chưa đăng nhập");

    const isAdmin = session.user.role === 'ADMIN';
    const permissions = (session.user.permissions as string[]) || [];
    const hasPermission = isAdmin || 
        permissions.includes('RECRUITMENT_MANAGE') || 
        permissions.includes('RECRUITMENT_CREATE') || 
        permissions.includes('RECRUITMENT_EDIT') ||
        permissions.includes('HR_APPROVE');

    if (!hasPermission) {
        throw new Error("Bạn không có quyền quản lý tin tuyển dụng!");
    }
    return session.user;
}

export async function createJobPosting(data: {
    title: string;
    requisitionId: string;
    content: string;
    channels: string;
    status?: string;
}) {
    try {
        const user = await verifyRecruitmentAuth();

        const posting = await prisma.jobPosting.create({
            data: {
                title: data.title,
                requisitionId: data.requisitionId,
                content: data.content,
                channels: data.channels || "Website, Mạng xã hội",
                status: data.status || "PUBLISHED",
                posterId: user.id
            },
            include: {
                requisition: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        department: true,
                        position: true,
                        headcount: true,
                        budget: true,
                        description: true,
                        _count: {
                            select: { applications: true }
                        }
                    }
                },
                poster: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            }
        });

        revalidatePath('/hr/recruitment/postings');
        revalidatePath('/careers/' + posting.id);
        return { success: true, data: posting };
    } catch (e: any) {
        console.error("Create Posting Error:", e);
        return { success: false, error: e.message || "Lỗi tạo tin tuyển dụng" };
    }
}

export async function updateJobPosting(id: string, data: {
    title: string;
    requisitionId: string;
    content: string;
    channels: string;
    status?: string;
}) {
    try {
        await verifyRecruitmentAuth();

        const updated = await prisma.jobPosting.update({
            where: { id },
            data: {
                title: data.title,
                requisitionId: data.requisitionId,
                content: data.content,
                channels: data.channels,
                ...(data.status ? { status: data.status } : {})
            },
            include: {
                requisition: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        department: true,
                        position: true,
                        headcount: true,
                        budget: true,
                        description: true,
                        _count: {
                            select: { applications: true }
                        }
                    }
                },
                poster: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            }
        });

        revalidatePath('/hr/recruitment/postings');
        revalidatePath('/careers/' + id);
        return { success: true, data: updated };
    } catch (e: any) {
        console.error("Update Posting Error:", e);
        return { success: false, error: e.message || "Lỗi cập nhật tin tuyển dụng" };
    }
}

export async function updatePostingStatus(id: string, status: string) {
    try {
        await verifyRecruitmentAuth();

        const updated = await prisma.jobPosting.update({
            where: { id },
            data: { status },
            include: {
                requisition: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        department: true,
                        position: true,
                        headcount: true,
                        budget: true,
                        _count: {
                            select: { applications: true }
                        }
                    }
                },
                poster: {
                    select: { id: true, name: true, email: true, avatar: true }
                }
            }
        });

        revalidatePath('/hr/recruitment/postings');
        revalidatePath('/careers/' + id);
        return { success: true, data: updated };
    } catch (e: any) {
        console.error("Update Status Error:", e);
        return { success: false, error: e.message || "Lỗi cập nhật trạng thái tin" };
    }
}

export async function deleteJobPosting(id: string) {
    try {
        await verifyRecruitmentAuth();

        await prisma.jobPosting.delete({
            where: { id }
        });

        revalidatePath('/hr/recruitment/postings');
        return { success: true };
    } catch (e: any) {
        console.error("Delete Posting Error:", e);
        return { success: false, error: e.message || "Lỗi xóa tin tuyển dụng" };
    }
}
