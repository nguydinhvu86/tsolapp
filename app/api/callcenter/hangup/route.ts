import { NextResponse } from 'next/server';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { prisma } from '@/lib/prisma';

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    let body: any = {};
    if (request.method === 'POST') {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try { body = await request.json(); } catch(e) {}
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
            try {
                const text = await request.text();
                const formParams = new URLSearchParams(text);
                formParams.forEach((val, key) => body[key] = val);
            } catch(e) {}
        } else if (contentType.includes('multipart/form-data')) {
            try {
                const formData = await request.formData();
                formData.forEach((val, key) => {
                    if (typeof val === 'string') {
                        body[key] = val;
                    }
                });
            } catch (e) {}
        }
    }

    console.log('[HANGUP] Incoming PBX Webhook:', {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        parsedBody: body
    });

    const callId = searchParams.get('callid') || body.callid;

    if (!callId) return NextResponse.json({ "status code": 400, message: "Missing callid" });

    try {
        const log = await (prisma as any).callLog.findUnique({ where: { callId } });
        if (log && log.userId) {
            await triggerPusherEvent(`user-${log.userId}`, 'pbx-hangup', { callId });
        }
        return NextResponse.json({ "status code": 200, message: "OK" });
    } catch (e) {
        console.error('Hangup error:', e);
        return NextResponse.json({ "status code": 500, message: "Server error" });
    }
}

export const GET = handler;
export const POST = handler;
