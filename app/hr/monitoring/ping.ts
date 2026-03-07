'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export async function updateUserActivityTimestamp() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false };

        await prisma.user.update({
            where: { id: session.user.id },
            data: { lastActiveAt: new Date() }
        });

        return { success: true };
    } catch (error) {
        // Silently fail, it's just a background ping
        return { success: false };
    }
}
