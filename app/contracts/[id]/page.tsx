import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ContractDetailClient } from './ContractDetailClient';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
    const contract = await prisma.contract.findUnique({
        where: { id: params.id },
        include: {
            appendices: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!contract) return notFound();

    const tasks = await prisma.task.findMany({
        where: { contractId: params.id },
        include: {
            assignees: { include: { user: { select: { name: true, email: true } } } },
            checklists: true
        },
        orderBy: { createdAt: 'desc' }
    });

    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '1.5rem', alignItems: 'start' }}>
            {/* Left Area: Main Content */}
            <div style={{ overflow: 'hidden' }}>
                <ContractDetailClient contract={contract} />
            </div>

            {/* Right Area: Task Panel */}
            <div style={{ position: 'sticky', top: '1rem' }}>
                <TaskPanel initialTasks={tasks} users={users} entityType="CONTRACT" entityId={params.id} />
            </div>
        </div>
    );
}
