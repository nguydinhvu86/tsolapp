'use server';

import { verifyActionPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createCampaign(data: {
    name: string;
    code: string;
    categoryId: string;
    description?: string;
    eventTime?: string;
    location?: string;
    startDate?: Date;
    endDate?: Date;
    budget?: number;
    status: string;
}) {
    try {
        const user = await verifyActionPermission('MARKETING_CREATE');
        if (!user) return { success: false, error: 'Unauthorized' };

        // Ensure code uniqueness
        const existing = await prisma.marketingCampaign.findUnique({
            where: { code: data.code }
        });
        if (existing) {
             return { success: false, error: 'Mã chiến dịch đã tồn tại. Vui lòng nhập mã khác.' };
        }

        const newCampaign = await prisma.marketingCampaign.create({
            data: {
                ...data,
                creatorId: user.id
            }
        });

        revalidatePath('/marketing/campaigns');
        return { success: true, data: newCampaign };
    } catch (error: any) {
        console.error("Error creating campaign:", error);
        return { success: false, error: error.message || 'Lỗi khi tạo chiến dịch' };
    }
}

export async function updateCampaign(id: string, data: any) {
    try {
        const user = await verifyActionPermission('MARKETING_EDIT');
        if (!user) return { success: false, error: 'Unauthorized' };

        // Ensure code uniqueness excluding self
        if (data.code) {
            const existing = await prisma.marketingCampaign.findFirst({
                where: { code: data.code, id: { not: id } }
            });
            if (existing) {
                 return { success: false, error: 'Mã chiến dịch đã tồn tại. Vui lòng nhập mã khác.' };
            }
            // Check dependency
            if (data.status === 'CANCELLED') {
               // Additional checks can be added here
            }
        }

        const updatedCampaign = await prisma.marketingCampaign.update({
            where: { id },
            data
        });

        revalidatePath('/marketing/campaigns');
        revalidatePath(`/marketing/campaigns/${id}`);
        return { success: true, data: updatedCampaign };
    } catch (error: any) {
        console.error("Error updating campaign:", error);
        return { success: false, error: error.message || 'Lỗi khi cập nhật' };
    }
}

export async function deleteCampaign(id: string) {
    try {
        const user = await verifyActionPermission('MARKETING_DELETE');
        if (!user) return { success: false, error: 'Unauthorized' };

        await prisma.marketingCampaign.delete({
            where: { id }
        });

        revalidatePath('/marketing/campaigns');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting campaign:", error);
        return { success: false, error: error.message || 'Lỗi khi xóa' };
    }
}
