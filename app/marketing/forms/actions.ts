'use server';

import { verifyActionPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createForm(data: {
    campaignId: string;
    title: string;
    description?: string;
    fields: any;
    isActive?: boolean;
}) {
    try {
        const user = await verifyActionPermission('MARKETING_CREATE');
        if (!user) return { success: false, error: 'Unauthorized' };

        const newForm = await prisma.marketingForm.create({
            data: {
                campaignId: data.campaignId,
                title: data.title,
                description: data.description,
                fieldsConfig: JSON.stringify(data.fields || []),
                isActive: data.isActive !== undefined ? data.isActive : false,
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

        const updatePayload: any = {};
        if (data.title !== undefined) updatePayload.title = data.title;
        if (data.description !== undefined) updatePayload.description = data.description;
        if (data.fields !== undefined) updatePayload.fieldsConfig = JSON.stringify(data.fields);
        if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

        const updatedForm = await prisma.marketingForm.update({
            where: { id },
            data: updatePayload
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
