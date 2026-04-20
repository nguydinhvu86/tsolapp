'use server';

import { prisma } from "@/lib/prisma";

export async function submitRegistration(formId: string, campaignId: string, rowData: any) {
    try {
        // Validate form existence
        const form = await prisma.marketingForm.findUnique({ where: { id: formId } });
        if (!form || !form.isPublished) {
            return { success: false, error: 'Biểu mẫu không còn nhận đăng ký.' };
        }

        // Basic deduplication via email or phone from common fields if you want, but row is JSON.
        // We'll just create the participant.
        const participant = await prisma.marketingParticipant.create({
            data: {
                campaignId,
                formId,
                status: 'REGISTERED',
                checkInTime: null,
                data: rowData
            }
        });

        return { success: true, participantId: participant.id };
    } catch (error: any) {
        console.error("Lỗi gửi form đăng ký:", error);
        return { success: false, error: error.message || 'Lỗi hệ thống khi gửi dữ liệu.' };
    }
}
