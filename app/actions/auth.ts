// @ts-nocheck
'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function logUserLogout() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false };

        // Find the most recent LoginLog for this user that doesn't have a logoutAt yet
        const latestLog = await prisma.loginLog.findFirst({
            where: { 
                userId: session.user.id,
                logoutAt: null
            },
            orderBy: { loginAt: 'desc' }
        });

        if (latestLog) {
            await prisma.loginLog.update({
                where: { id: latestLog.id },
                data: { logoutAt: new Date() }
            });
        }
        
        return { success: true };
    } catch (e) {
        console.error("Error logging user logout:", e);
        return { success: false };
    }
}
