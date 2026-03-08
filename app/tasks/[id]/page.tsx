import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { TaskDetailClient } from './TaskDetailClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getTemplatesByModule } from '@/app/email-templates/actions';

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const perms = (session?.user?.permissions as string[]) || [];
    const isViewAll = perms.includes('TASKS_VIEW_ALL');
    const isViewOwn = perms.includes('TASKS_VIEW_OWN');

    if (!isViewAll && !isViewOwn) return notFound();

    const task = await prisma.task.findUnique({
        where: { id: params.id },
        include: {
            creator: { select: { id: true, name: true } },
            assignees: { include: { user: { select: { id: true, name: true } } } },
            observers: { include: { user: { select: { id: true, name: true } } } },
            checklists: {
                orderBy: { createdAt: 'asc' },
                include: { completedBy: { select: { id: true, name: true } } }
            },
            comments: {
                orderBy: { createdAt: 'asc' },
                include: {
                    user: { select: { id: true, name: true } },
                    reactions: { include: { user: { select: { name: true } } } }
                }
            },
            attachments: { include: { uploadedBy: { select: { id: true, name: true } } } },
            activityLogs: {
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, name: true } } }
            },
            customer: { select: { id: true, name: true } },
            contract: { select: { id: true, title: true } },
            quote: { select: { id: true, title: true } },
            handover: { select: { id: true, title: true } },
            paymentReq: { select: { id: true, title: true } },
            dispatch: { select: { id: true, title: true } },
            salesOrder: { select: { id: true, code: true } },
            salesInvoice: { select: { id: true, code: true } },
            salesEstimate: { select: { id: true, code: true } },
            salesPayment: { select: { id: true, code: true } },
            lead: { select: { id: true, name: true, code: true } }
        }
    });

    if (!task) return notFound();

    // Security check: If not View All, verify user is creator, assignee, or observer
    if (!isViewAll && userId) {
        const isRelated = task.creatorId === userId ||
            task.assignees.some((a: any) => a.userId === userId) ||
            task.observers.some((o: any) => o.userId === userId);

        if (!isRelated) return notFound(); // Or a custom 403 page
    }

    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
    });

    const taskTemplates = await getTemplatesByModule('TASK');
    const generalTemplates = await getTemplatesByModule('GENERAL');
    const allTemplates = [...taskTemplates, ...generalTemplates];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <TaskDetailClient initialTask={task as any} users={users} emailTemplates={allTemplates} />
        </div>
    );
}
