import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { endpoint, keys, userAgent } = body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json({ error: 'Missing subscription details' }, { status: 400 });
        }

        // Check if subscription already exists for this endpoint
        // @ts-ignore
        const existingSub = await prisma.pushSubscription.findFirst({
            where: { endpoint }
        });

        if (existingSub) {
            if (existingSub.userId !== session.user.id) {
                // Endpoint relates to another user -> Update it
                // @ts-ignore
                await prisma.pushSubscription.update({
                    where: { id: existingSub.id },
                    data: { userId: session.user.id }
                });
            }
            return NextResponse.json({ message: 'Subscription mapped to current user' });
        }

        // Create new subscription
        // @ts-ignore
        await prisma.pushSubscription.create({
            data: {
                userId: session.user.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                userAgent: userAgent || ''
            }
        });

        return NextResponse.json({ message: 'Subscription added successfully' }, { status: 201 });
    } catch (error) {
        console.error('Error saving push subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
