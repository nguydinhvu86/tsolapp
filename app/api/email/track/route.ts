import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerPusherEvent } from '@/lib/pusher-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const trackingId = searchParams.get('id');

    if (trackingId) {
        try {
            // Find the email log by tracking ID
            const emailLog = await prisma.emailLog.findUnique({
                where: { trackingId }
            });

            // If it exists and hasn't been opened yet, mark it as OPENED
            if (emailLog && emailLog.status !== 'OPENED') {
                await prisma.emailLog.update({
                    where: { trackingId },
                    data: {
                        status: 'OPENED',
                        openedAt: new Date(),
                    }
                });

                if (emailLog.senderId) {
                    await triggerPusherEvent(`user-${emailLog.senderId}`, 'new-notification', { type: 'SILENT_REFRESH' });
                }
            }
        } catch (error) {
            console.error('Error tracking email open:', error);
            // Don't fail the request, just log it. We still need to return the image.
        }
    }

    // Return a 1x1 transparent PNG image
    const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

    return new NextResponse(transparentPixel, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store'
        }
    });
}
