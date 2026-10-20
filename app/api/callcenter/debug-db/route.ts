import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

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
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
