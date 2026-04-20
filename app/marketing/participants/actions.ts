'use server';

import { verifyActionPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function checkInParticipant(participantId: string) {
    try {
        const user = await verifyActionPermission('MARKETING_EDIT');
        if (!user) return { success: false, error: 'Unauthorized' };

        const p = await prisma.marketingParticipant.findUnique({ where: { id: participantId } });
        if (!p) throw new Error("Participant not found");

        const updated = await prisma.marketingParticipant.update({
            where: { id: participantId },
            data: {
                status: 'ATTENDED',
                checkInTime: new Date()
            }
        });

        revalidatePath('/marketing/campaigns');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error checking in:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteParticipant(participantId: string) {
    try {
        const user = await verifyActionPermission('MARKETING_DELETE');
        if (!user) return { success: false, error: 'Unauthorized' };

        await prisma.marketingParticipant.delete({
            where: { id: participantId }
        });

        revalidatePath('/marketing/campaigns');
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting:", error);
        return { success: false, error: error.message };
    }
}
