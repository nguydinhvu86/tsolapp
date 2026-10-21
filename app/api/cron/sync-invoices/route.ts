import { NextResponse } from 'next/server';
import { fetchUnreadInvoices } from '@/lib/email-scanner';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Secure the cron endpoint with secret token check
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const isAuthorized = Boolean(process.env.CRON_SECRET && (token === process.env.CRON_SECRET || bearerToken === process.env.CRON_SECRET));

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const result = await fetchUnreadInvoices();
        if (result.success) {
            return NextResponse.json({ message: 'Sync complete', count: result.processedCount });
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
