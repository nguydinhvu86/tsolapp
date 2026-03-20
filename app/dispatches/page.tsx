import { prisma } from '@/lib/prisma';
import { DispatchListClient } from './DispatchListClient';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { buildViewFilter } from '@/lib/permissions';

export default async function DispatchesPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    const viewFilter = buildViewFilter(
        session.user.id,
        (session.user.permissions as string[]) || [],
        'DISPATCHES',
        'creatorId'
    );

    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') {
        return <div className="p-6 text-red-500">Bạn không có quyền truy cập trang này.</div>;
    }

    const dispatches = await prisma.dispatch.findMany({
        where: viewFilter,
        include: { customer: true, template: true },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="w-full px-4 md:px-8 pb-12">
            <DispatchListClient initialData={dispatches} />
        </div>
    );
}
