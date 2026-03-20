import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { EditDispatchClient } from './EditDispatchClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { buildViewFilter } from '@/lib/permissions';

export default async function EditDispatchPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return notFound();

    // Check permission to read
    const perms = (session.user.permissions as string[]) || [];
    const isAdmin = session.user.role === 'ADMIN';
    const canEdit = isAdmin || perms.includes('DISPATCHES_EDIT');
    if (!canEdit) return notFound();

    const viewFilter = buildViewFilter(session.user.id, perms, 'DISPATCHES', 'creatorId', true);
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return notFound();

    const dispatch = await prisma.dispatch.findFirst({
        where: { id: params.id, ...viewFilter }
    });

    if (!dispatch) return notFound();

    const templates = await prisma.dispatchTemplate.findMany({
        orderBy: { name: 'asc' }
    });

    const customers = await prisma.customer.findMany({
        orderBy: { name: 'asc' }
    });

    const products = await prisma.product.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="w-full px-4 md:px-8 pb-12">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                Chỉnh sửa Công Văn / Thông Báo
            </h1>
            <EditDispatchClient dispatch={dispatch} templates={templates} customers={customers} products={products} />
        </div>
    );
}
