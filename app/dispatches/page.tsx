import { prisma } from '@/lib/prisma';
import { DispatchListClient } from './DispatchListClient';

export default async function DispatchesPage() {
    const dispatches = await prisma.dispatch.findMany({
        include: { customer: true, template: true },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div>
            <DispatchListClient initialData={dispatches} />
        </div>
    );
}
