import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerPusherEvent } from '@/lib/pusher-server';

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

    console.log('[CALLDATA] Incoming PBX Webhook:', {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        parsedBody: body
    });

    const callId = searchParams.get('callid') || body.callid;
    const calldate = searchParams.get('calldate') || body.calldate;
    const durationStr = searchParams.get('duration') || body.duration || '0';
    const billsecStr = searchParams.get('billsec') || body.billsec || '0';
    const duration = parseInt(durationStr, 10);
    const billsec = parseInt(billsecStr, 10);
    const status = searchParams.get('status') || body.status;
    const extension = searchParams.get('extension') || body.extension;
    const phone = searchParams.get('phone') || body.phone;
    const recordingUrl = searchParams.get('recordingfile') || searchParams.get('recordingUrl') || body.recordingfile || body.recordingUrl;
    const holdtime = searchParams.get('holdtime') || body.holdtime; 
    let type = searchParams.get('direction') || body.direction || searchParams.get('type') || body.type;

    if (type) {
        if (typeof type === 'string') {
            type = type.toUpperCase();
            if (type.includes('IN') || type === '1') type = 'INBOUND';
            else if (type.includes('OUT') || type === '0') type = 'OUTBOUND';
        }
    } else {
        type = 'UNKNOWN';
    } 

    
    if (!callId) return NextResponse.json({ "status code": 400, message: "Missing callid" });

    try {
        const customer = phone ? await prisma.customer.findFirst({ where: { phone } }) : null;
        const lead = (!customer && phone) ? await prisma.lead.findFirst({ where: { phone } }) : null;
        const agent = extension ? await prisma.user.findFirst({ where: { extension } as any }) : null;

        let parsedStartDate = new Date();
        if (calldate) {
           parsedStartDate = new Date(calldate.replace(' ', 'T') + '+07:00'); 
        }

        const log = await (prisma as any).callLog.upsert({
            where: { callId },
            update: {
                duration,
                billsec: holdtime ? 0 : billsec, 
                status: status || 'UNKNOWN',
                recordingUrl,
                type: type || 'UNKNOWN'
            },
            create: {
                callId,
                type: type || 'UNKNOWN',
                phone: phone || '',
                extension: extension || '',
                userId: agent?.id,
                customerId: customer?.id,
                leadId: lead?.id,
                startedAt: parsedStartDate,
                duration,
                billsec: holdtime ? 0 : billsec, 
                status: status || 'UNKNOWN',
                recordingUrl,
            }
        });

        if (log.userId) {
             await triggerPusherEvent(`user-${log.userId}`, 'pbx-calldata', { callId, status, billsec });
        }

        return NextResponse.json({ "status code": 200, "message": "OK" });
    } catch (e) {
        console.error('Calldata error:', e);
        return NextResponse.json({ "status code": 500, "message": "Server error" });
    }
}

export const GET = handler;
export const POST = handler;
