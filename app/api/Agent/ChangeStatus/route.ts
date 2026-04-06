import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerPusherEvent } from '@/lib/pusher-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const extension = searchParams.get('extension');
    const status = searchParams.get('status');

    if (!extension || !status) return NextResponse.json({ "status code": 400, "message": "Missing params" });

    try {
        const agent = await prisma.user.findFirst({ where: { extension } as any });
        if (agent) {
             await triggerPusherEvent('callcenter-dashboard', 'agent-status', { 
                 userId: agent.id, 
                 extension, 
                 status 
             });
        }
        return NextResponse.json({ "status code": 200, "message": "OK" });
    } catch (e) {
        return NextResponse.json({ "status code": 500, "message": "Error" });
    }
}
