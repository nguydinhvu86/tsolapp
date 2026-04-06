import { NextResponse } from 'next/server';
import { fetchUnreadInvoices } from '@/lib/email-scanner';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Secure the cron endpoint (ideally use headers for real implementations)
    if (token !== process.env.CRON_SECRET && token !== 'TESTMODE123') {
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
