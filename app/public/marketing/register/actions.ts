'use server';

import { prisma } from "@/lib/prisma";

export async function submitRegistration(formId: string, campaignId: string, rowData: any) {
    try {
        // Validate form existence
        const form = await prisma.marketingForm.findUnique({ where: { id: formId } });
        if (!form || !form.isActive) {
            return { success: false, error: 'Biểu mẫu không tồn tại hoặc đã ngừng nhận đăng ký' };
        }

        let fieldsConfig: any[] = [];
        try {
            if (typeof form.fieldsConfig === 'string') {
                fieldsConfig = JSON.parse(form.fieldsConfig);
            } else if (Array.isArray(form.fieldsConfig)) {
                fieldsConfig = form.fieldsConfig;
            } else if (Array.isArray((form as any).fields)) {
                fieldsConfig = (form as any).fields;
            }
        } catch (e) {
            console.error(e);
        }

        let name = "Khách hàng";
        let email = null;
        let phone = null;

        for (const field of fieldsConfig) {
            const val = rowData[field.id];
            if (!val) continue;

            const fieldNameLower = field.name.toLowerCase();
            if (field.type === 'phone' || fieldNameLower.includes('điện thoại') || fieldNameLower.includes('phone')) {
                phone = val;
            } else if (field.type === 'email' || fieldNameLower.includes('email')) {
                email = val;
            } else if (fieldNameLower.includes('tên') || fieldNameLower.includes('name')) {
                name = val;
            }
        }

        // We'll just create the participant.
        const participant = await prisma.marketingParticipant.create({
            data: {
                campaignId,
                formId,
                status: 'REGISTERED',
                name,
                email,
                phone,
                source: 'FORM',
                customData: JSON.stringify(rowData)
            }
        });

        return { success: true, participantId: participant.id };
    } catch (error: any) {
        console.error("Lỗi gửi form đăng ký:", error);
        return { success: false, error: error.message || 'Lỗi hệ thống khi gửi dữ liệu.' };
    }
}
