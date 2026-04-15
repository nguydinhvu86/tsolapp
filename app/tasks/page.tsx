import { prisma } from '@/lib/prisma';
import { TaskDashboardClient } from './TaskDashboardClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export default async function TasksPage({
    searchParams,
}: {
    searchParams: { status?: string; assigneeId?: string; priority?: string; action?: string; }
}) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return <div>Unauthorized</div>;
    const permissions = session?.user?.permissions || [];

    const viewAll = permissions.includes('TASKS_VIEW_ALL');
    const viewOwn = permissions.includes('TASKS_VIEW_OWN');

    if (!viewAll && !viewOwn) {
        return <div className="p-8 text-center text-red-500 font-bold">Bạn không có quyền truy cập trang này.</div>;
    }

    const canCreate = permissions.includes('TASKS_CREATE') || session?.user?.role === 'ADMIN';
    if (searchParams.action === 'new' && !canCreate) {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }

    // Build filter map
    const where: any = {};
    if (searchParams.status) where.status = searchParams.status;
    if (searchParams.priority) where.priority = searchParams.priority;
    if (searchParams.assigneeId) {
        where.assignees = {
            some: {
                userId: searchParams.assigneeId
            }
        };
    }

    // Apply VIEW_OWN logic natively
    if (!viewAll && viewOwn) {
        // Find tasks where user is assignee, creator, or observer
        where.OR = [
            { creatorId: userId },
            { assignees: { some: { userId } } },
            { observers: { some: { userId } } }
        ];
    }

    // Optimize: Fetch everything in parallel and exclude heavy unneeded arrays (comments, attachments, logs)
    const [tasks, users] = await Promise.all([
        prisma.task.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                creator: { select: { id: true, name: true, avatar: true } },
                assignees: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
                observers: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                checklists: { select: { isCompleted: true } }, // Only need completeness for progress bar
                customer: { select: { id: true, name: true } },
                contract: { select: { id: true, title: true } },
                quote: { select: { id: true, title: true } },
                handover: { select: { id: true, title: true } },
                paymentReq: { select: { id: true, title: true } },
                dispatch: { select: { id: true, title: true } },
                lead: { select: { id: true, name: true } },
                supplier: { select: { id: true, name: true } },
                expense: { select: { id: true, code: true, description: true } },
                appendix: { select: { id: true, title: true } },
                purchaseOrder: { select: { id: true, code: true } },
                purchaseBill: { select: { id: true, code: true } },
                purchasePayment: { select: { id: true, code: true } },
                salesOrder: { select: { id: true, code: true } },
                salesInvoice: { select: { id: true, code: true } },
                salesEstimate: { select: { id: true, code: true } },
                salesPayment: { select: { id: true, code: true } }
            }
        }),
        prisma.user.findMany({
            select: { id: true, name: true, email: true, avatar: true },
            orderBy: { name: 'asc' }
        })
    ]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Quản lý Công Việc (Tasks)</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Theo dõi, giao việc và cập nhật tiến độ cho mọi dự án.</p>
                </div>
            </div>

            <TaskDashboardClient
                initialTasks={tasks as any}
                users={users}
            />
        </div>
    );
}
