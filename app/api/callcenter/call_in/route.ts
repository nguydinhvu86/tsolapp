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

    console.log('[CALL_IN] Incoming PBX Webhook:', {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        parsedBody: body
    });

    let phone = searchParams.get('phone') || body.phone || searchParams.get('callerid') || body.callerid || searchParams.get('caller') || body.caller;
    let extension = searchParams.get('extension') || body.extension || searchParams.get('destination') || body.destination || searchParams.get('callee') || body.callee || searchParams.get('agent') || body.agent;
    let callId = searchParams.get('callid') || body.callid || searchParams.get('call_id') || body.call_id || searchParams.get('uuid') || body.uuid;
    let event = searchParams.get('event') || body.event || searchParams.get('status') || body.status; // RING, ANSWER

    if (!phone) {
        console.error('[CALL_IN] Error Missing phone:', { phone, extension, callId, data: body, url: request.url });
        return NextResponse.json({ status: 400, message: "Missing phone number" }, { status: 400 });
    }

    const isQueueCall = !extension && !callId && searchParams.has('queue');
    if (!callId) {
        callId = 'queue-' + phone + '-' + Date.now();
    }

    try {
        const customer = await prisma.customer.findFirst({ where: { phone } });
        const lead = !customer ? await prisma.lead.findFirst({ where: { phone } }) : null;
        
        let targetAgents: any[] = [];
        if (extension) {
            const agent = await prisma.user.findFirst({ where: { extension } as any });
            if (agent) targetAgents.push(agent);
        } else {
            // Queue call, broadcast to everyone with an extension
            targetAgents = await prisma.user.findMany({ where: { extension: { not: null, notIn: [''] } } });
        }

        // Only upsert to DB if we have a real callId from PBX
        if (!callId.startsWith('queue-')) {
            await (prisma as any).callLog.upsert({
                where: { callId },
                update: {
                    status: event || 'RINGING',
                },
                create: {
                    callId,
                    type: 'INBOUND',
                    phone,
                    extension: extension || 'QUEUE',
                    userId: targetAgents[0]?.id,
                    customerId: customer?.id,
                    leadId: lead?.id,
                    startedAt: new Date(),
                    duration: 0,
                    billsec: 0,
                    status: event || 'RINGING',
                }
            });
        }

        for (const agent of targetAgents) {
            await triggerPusherEvent(`user-${agent.id}`, 'pbx-ring', {
                callId, phone, event, type: 'INBOUND',
                customer: customer ? { id: customer.id, name: customer.name } : null,
                lead: lead ? { id: lead.id, name: lead.name } : null
            });
        }

        return NextResponse.json({ "status code": 200, message: "OK" });
    } catch (e) {
        console.error('Call IN error:', e);
        return NextResponse.json({ "status code": 500, message: "Server error" });
    }
}

export const GET = handler;
export const POST = handler;
