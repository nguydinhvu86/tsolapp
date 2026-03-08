import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { ProjectDetailClient } from './ProjectDetailClient';
import { notFound, redirect } from 'next/navigation';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) redirect('/login');

    const userId = session.user.id;
    const perms = (session.user.permissions as string[]) || [];
    const isViewAll = perms.includes('TASKS_VIEW_ALL');
    const isViewOwn = perms.includes('TASKS_VIEW_OWN');

    if (!isViewAll && !isViewOwn) notFound();

    const project = await (prisma.task as any).findFirst({
        where: { id: params.id, isProject: true },
        include: {
            creator: { select: { id: true, name: true, avatar: true } },
            assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
            comments: {
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, name: true, avatar: true } } }
            },
            attachments: { include: { uploadedBy: { select: { id: true, name: true } } } },
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
            childTasks: {
                include: {
                    assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                    creator: { select: { id: true, name: true } },
                    observers: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                    checklists: {
                        orderBy: { createdAt: 'asc' },
                        include: { completedBy: { select: { id: true, name: true } } }
                    },
                    comments: {
                        orderBy: { createdAt: 'desc' },
                        include: { user: { select: { id: true, name: true, avatar: true } } }
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
                    dispatch: { select: { id: true, title: true } }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!project) notFound();

    if (!isViewAll && isViewOwn && userId) {
        const isRelated = project.creatorId === userId ||
            project.assignees.some((a: any) => a.userId === userId) ||
            project.observers?.some((o: any) => o.userId === userId) ||
            project.childTasks?.some((ct: any) =>
                ct.creatorId === userId ||
                ct.assignees.some((a: any) => a.userId === userId) ||
                ct.observers?.some((o: any) => o.userId === userId)
            );

        if (!isRelated) notFound();
    }

    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, avatar: true },
        orderBy: { name: 'asc' }
    });

    return <ProjectDetailClient project={project as any} users={users} />;
}
