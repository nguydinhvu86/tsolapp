import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { syncPbxCallLogs } from '@/app/call-center/actions';

async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    let body: any = {};
    let rawText = '';
    if (request.method === 'POST') {
        try {
            rawText = await request.text();
            
            const contentType = request.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try { body = JSON.parse(rawText); } catch(e) {}
            } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('application/json') === false) {
                // Default to URL encoded if not JSON just in case VoiceCloud omits content type
                const formParams = new URLSearchParams(rawText);
                formParams.forEach((val, key) => body[key] = val);
            }
        } catch(e) {}
    }

    console.log('[CALLDATA] Incoming PBX Webhook:', {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        parsedBody: body,
        rawText
    });

    try {
        require('fs').appendFileSync('./public/test-webhook.txt', new Date().toISOString() + ' | CALLDATA | ' + request.url + ' | RAW: ' + rawText + '\\n');
    } catch(e) {}

    const callId = searchParams.get('callid') || body.callid;
    const calldate = searchParams.get('calldate') || body.calldate;
    const durationStr = searchParams.get('duration') || body.duration || '0';
    const billsecStr = searchParams.get('billsec') || body.billsec || '0';
    const duration = parseInt(durationStr, 10) || 0;
    const billsec = parseInt(billsecStr, 10) || 0;
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
        let customer = null;
        let lead = null;
        if (phone) {
             const cleanPhone = phone.replace(/\D/g, '').slice(-9);
             if (cleanPhone) {
                 customer = await prisma.customer.findFirst({ where: { phone: { endsWith: cleanPhone } } });
                 if (!customer) lead = await prisma.lead.findFirst({ where: { phone: { endsWith: cleanPhone } } });
             }
        }
        const agent = extension ? await prisma.user.findFirst({ where: { extension } as any }) : null;

        let parsedStartDate = new Date();
        if (calldate) {
           parsedStartDate = new Date(calldate.replace(' ', 'T') + '+07:00'); 
        }

        let log = await (prisma as any).callLog.findUnique({ where: { callId } });
        
        if (log) {
            log = await (prisma as any).callLog.update({
                where: { callId },
                data: {
                    ...(duration > 0 && { duration }),
                    ...((billsec > 0 || holdtime) && { billsec: holdtime ? 0 : billsec }), 
                    ...(status && { status }),
                    ...(recordingUrl && { recordingUrl }),
                    ...(type !== 'UNKNOWN' && { type })
                }
            });
        } else {
            if (!phone && !extension) {
                try {
                    setTimeout(() => {
                        syncPbxCallLogs(0, true).catch(console.error);
                    }, 500); // Async execution off-thread
                } catch(e) {}
                return NextResponse.json({ "status code": 200, message: "Ignored phantom CDR, explicitly triggering async PBX background sync" });
            }
            log = await (prisma as any).callLog.create({
                data: {
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
        }

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
