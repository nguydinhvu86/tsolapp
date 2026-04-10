import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { phone, type, duration, status } = body;
        const callId = 'webrtc-' + Date.now();

        const cleanPhone = phone.replace(/\\D/g, '').slice(-9);
        let customer = null, lead = null;
        if (cleanPhone) {
            customer = await prisma.customer.findFirst({ where: { phone: { endsWith: cleanPhone } } });
            if (!customer) lead = await prisma.lead.findFirst({ where: { phone: { endsWith: cleanPhone } } });
        }

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });

        await (prisma as any).callLog.create({
            data: {
                callId,
                type: type || 'UNKNOWN',
                phone: phone || '',
                extension: user?.extension || '',
                userId: user?.id,
                customerId: customer?.id,
                leadId: lead?.id,
                startedAt: new Date(Date.now() - (duration * 1000)),
                duration: duration || 0,
                billsec: duration || 0,
                status: status || 'ANSWER',
            }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('WebRTC Logging Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
