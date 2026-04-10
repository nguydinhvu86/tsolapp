import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone') || '';
    
    try {
        const logs = await (prisma as any).callLog.findMany({
            where: { phone: { contains: phone } },
            orderBy: { startedAt: 'desc' },
            take: 20
        });
        return NextResponse.json(logs);
    } catch(e: any) {
        return NextResponse.json({ error: e.message });
    }
}
