import { prisma } from '@/lib/prisma';

export async function logCustomerActivity(customerId: string, userId: string, action: string, details?: string) {
    try {
        await prisma.customerActivityLog.create({
            data: {
                customerId,
                userId,
                action,
                details
            }
        });
    } catch (error) {
        console.error("Lỗi khi ghi Lịch sử khách hàng:", error);
        // Do not throw to prevent breaking the main transaction
    }
}
