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
                status: 'ATTENDED'
            }
        });

        revalidatePath('/marketing/campaigns');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error checking in:", error);
        return { success: false, error: error.message };
    }
}

export async function updateParticipantStatus(participantId: string, status: string) {
    try {
        const user = await verifyActionPermission('MARKETING_EDIT');
        if (!user) return { success: false, error: 'Unauthorized' };

        const p = await prisma.marketingParticipant.findUnique({ where: { id: participantId } });
        if (!p) throw new Error("Participant not found");

        let customDataObj: any = {};
        if (p.customData) {
            try {
                customDataObj = JSON.parse(p.customData);
            } catch (e) {}
        }

        if (status === 'REMINDED_1') {
            customDataObj['_remind1At'] = new Date().toISOString();
        } else if (status === 'REMINDED_2') {
            customDataObj['_remind2At'] = new Date().toISOString();
        }

        const updated = await prisma.marketingParticipant.update({
            where: { id: participantId },
            data: { 
                status,
                customData: JSON.stringify(customDataObj)
            }
        });

        revalidatePath('/marketing/campaigns');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error updating status:", error);
        return { success: false, error: error.message };
    }
}

export async function cancelCheckInParticipant(participantId: string) {
    try {
        const user = await verifyActionPermission('MARKETING_EDIT');
        if (!user) return { success: false, error: 'Unauthorized' };

        const p = await prisma.marketingParticipant.findUnique({ where: { id: participantId } });
        if (!p) throw new Error("Participant not found");

        const updated = await prisma.marketingParticipant.update({
            where: { id: participantId },
            data: {
                status: 'REGISTERED' // Reset status to REGISTERED
            }
        });

        revalidatePath('/marketing/campaigns');
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Error canceling check in:", error);
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
