import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const trackingId = searchParams.get('id');
    const redirectUrl = searchParams.get('url');

    if (trackingId) {
        try {
            // Find the email log by tracking ID
            const emailLog = await prisma.emailLog.findUnique({
                where: { trackingId }
            });

            // If it exists, mark it as OPENED (clicking implies opening)
            if (emailLog && emailLog.status !== 'OPENED') {
                await prisma.emailLog.update({
                    where: { trackingId },
                    data: {
                        status: 'OPENED',
                        openedAt: new Date(),
                    }
                });
            }
        } catch (error) {
            console.error('Error tracking email click:', error);
            // Even if tracking fails, we still want to redirect the user
        }
    }

    // Redirect to the original URL if valid, else go to home page
    if (redirectUrl) {
        let finalUrl = redirectUrl;
        // Basic safety check for valid URLs if needed
        if (!finalUrl.startsWith('http')) {
            finalUrl = 'http://' + finalUrl;
        }
        return NextResponse.redirect(finalUrl);
    } else {
        return NextResponse.redirect(new URL('/', request.url));
    }
}
