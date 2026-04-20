'use server';

import { verifyActionPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createCategory(data: { name: string; description?: string }) {
    try {
        const user = await verifyActionPermission('MARKETING_CREATE');
        if (!user) return { success: false, error: 'Unauthorized' };

        const newCategory = await prisma.marketingCategory.create({
            data: {
                name: data.name,
                description: data.description,
            }
        });

        revalidatePath('/marketing/categories');
        return { success: true, data: newCategory };
    } catch (error: any) {
        console.error("Error creating category:", error);
        return { success: false, error: error.message || 'Lỗi khi tạo danh mục' };
    }
}

export async function updateCategory(id: string, data: { name: string; description?: string }) {
    try {
        const user = await verifyActionPermission('MARKETING_EDIT');
        if (!user) return { success: false, error: 'Unauthorized' };

        const updatedCategory = await prisma.marketingCategory.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
            }
        });

        revalidatePath('/marketing/categories');
        return { success: true, data: updatedCategory };
    } catch (error: any) {
        console.error("Error updating category:", error);
        return { success: false, error: error.message || 'Lỗi khi cập nhật' };
    }
}

export async function deleteCategory(id: string) {
    try {
        const user = await verifyActionPermission('MARKETING_DELETE');
        if (!user) return { success: false, error: 'Unauthorized' };

        await prisma.marketingCategory.delete({
            where: { id }
        });

        revalidatePath('/marketing/categories');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting category:", error);
        return { success: false, error: error.message || 'Lỗi khi xóa' };
    }
}
