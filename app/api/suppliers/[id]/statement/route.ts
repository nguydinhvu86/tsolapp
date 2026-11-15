import { NextRequest, NextResponse } from 'next/server';
import { getSupplierStatement } from '@/app/suppliers/[id]/statement/actions';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate') || format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const endDate = searchParams.get('endDate') || format(endOfMonth(new Date()), 'yyyy-MM-dd');
        const supplierId = params.id;

        if (!supplierId) {
            return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
        }

        const res = await getSupplierStatement(supplierId, startDate, endDate);
        if (!res.success) {
            return NextResponse.json({ error: res.error || 'Failed to fetch statement' }, { status: 500 });
        }

        return NextResponse.json(res);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
    }
}
