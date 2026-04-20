'use server';

import { verifyActionPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createForm(data: {
    campaignId: string;
    title: string;
    description?: string;
    fields: any;
    isPublished?: boolean;
}) {
    try {
        const user = await verifyActionPermission('MARKETING_CREATE');
        if (!user) return { success: false, error: 'Unauthorized' };

        // Generate unique slug
        const slug = `form-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newForm = await prisma.marketingForm.create({
            data: {
                campaignId: data.campaignId,
                title: data.title,
                description: data.description,
                fields: data.fields || [],
                isPublished: data.isPublished || false,
                slug,
            }
        });

        revalidatePath('/marketing/forms');
        revalidatePath(`/marketing/campaigns/${data.campaignId}`);
        return { success: true, data: newForm };
    } catch (error: any) {
        console.error("Error creating form:", error);
        return { success: false, error: error.message || 'Lỗi khi tạo form' };
    }
}

export async function updateForm(id: string, data: any) {
    try {
        const user = await verifyActionPermission('MARKETING_EDIT');
        if (!user) return { success: false, error: 'Unauthorized' };

        const updatedForm = await prisma.marketingForm.update({
            where: { id },
            data
        });

        revalidatePath('/marketing/forms');
        revalidatePath(`/marketing/campaigns/${updatedForm.campaignId}`);
        return { success: true, data: updatedForm };
    } catch (error: any) {
        console.error("Error updating form:", error);
        return { success: false, error: error.message || 'Lỗi khi cập nhật' };
    }
}

export async function deleteForm(id: string) {
    try {
        const user = await verifyActionPermission('MARKETING_DELETE');
        if (!user) return { success: false, error: 'Unauthorized' };

        const form = await prisma.marketingForm.delete({
            where: { id }
        });

        revalidatePath('/marketing/forms');
        revalidatePath(`/marketing/campaigns/${form.campaignId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting form:", error);
        return { success: false, error: error.message || 'Lỗi khi xóa' };
    }
}
