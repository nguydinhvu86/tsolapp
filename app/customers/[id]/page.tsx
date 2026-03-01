import { getCustomerWithRelations } from './actions';
import { CustomerDetailClient } from './CustomerDetailClient';
import { prisma } from '@/lib/prisma';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
    const customer = await getCustomerWithRelations(params.id);

    if (!customer) {
        return <div className="p-8">Không tìm thấy khách hàng.</div>;
    }

    const tasks = await prisma.task.findMany({
        where: { customerId: params.id },
        include: {
            assignees: { include: { user: { select: { name: true, email: true } } } },
            checklists: true
        },
        orderBy: { createdAt: 'desc' }
    });

    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '1.5rem', alignItems: 'start', padding: '1rem' }}>
            <div style={{ overflow: 'hidden' }}>
                <CustomerDetailClient customer={customer} />
            </div>

            <div style={{ position: 'sticky', top: '1rem' }}>
                <TaskPanel initialTasks={tasks} users={users} entityType="CUSTOMER" entityId={params.id} />
            </div>
        </div>
    );
}
