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
        }
    }

    const phone = searchParams.get('phone') || body.phone;
    const extension = searchParams.get('extension') || body.extension;
    const callId = searchParams.get('callid') || body.callid;
    const event = searchParams.get('event') || body.event;

    if (!callId || !extension || !phone) {
        return NextResponse.json({ status: 400, message: "Missing params" }, { status: 400 });
    }

    try {
        const customer = await prisma.customer.findFirst({ where: { phone } });
        const lead = !customer ? await prisma.lead.findFirst({ where: { phone } }) : null;
        const agent = await prisma.user.findFirst({ where: { extension } as any });

        await (prisma as any).callLog.upsert({
            where: { callId },
            update: {
                status: event || 'RINGING',
            },
            create: {
                callId,
                type: 'OUTBOUND',
                phone,
                extension,
                userId: agent?.id,
                customerId: customer?.id,
                leadId: lead?.id,
                startedAt: new Date(),
                duration: 0,
                billsec: 0,
                status: event || 'RINGING',
            }
        });

        if (agent) {
            await triggerPusherEvent(`user-${agent.id}`, 'pbx-ring', {
                callId, phone, event, type: 'OUTBOUND',
                customer: customer ? { id: customer.id, name: customer.name } : null,
                lead: lead ? { id: lead.id, name: lead.name } : null
            });
        }

        return NextResponse.json({ "status code": 200, message: "OK" });
    } catch (e) {
        console.error('Call INIT error:', e);
        return NextResponse.json({ "status code": 500, message: "Server error" });
    }
}

export const GET = handler;
export const POST = handler;
