import { NextResponse } from 'next/server';
import { syncPbxCallLogs } from '@/app/call-center/actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow 5 minutes execution time

export async function GET() {
    try {
        // We sync only the last 1 day to make the cronjob quick and efficient (every 5 mins)
        // If they need historically, they can use the UI sync button.
        const result = await syncPbxCallLogs(1);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
