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

    const project = await prisma.project.findUnique({
        where: { id: params.id },
        include: {
            creator: { select: { id: true, name: true, avatar: true } },
            members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
            topics: {
                orderBy: { createdAt: 'desc' },
                include: { creator: { select: { id: true, name: true, avatar: true } }, comments: { include: { user: { select: { id: true, name: true, avatar: true } }, reactions: true } } }
            },
            comments: {
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, name: true, avatar: true } }, reactions: true }
            },
            attachments: { include: { uploadedBy: { select: { id: true, name: true } } } },
            customer: { select: { id: true, name: true, phone: true, email: true } },
            contract: { select: { id: true, title: true, status: true, createdAt: true } },
            quote: { select: { id: true, title: true, status: true, createdAt: true } },
            salesEstimate: { select: { id: true, code: true, status: true, totalAmount: true, date: true } },
            salesOrder: { select: { id: true, code: true, status: true, totalAmount: true, date: true } },
            invoice: { select: { id: true, code: true, status: true, totalAmount: true, paidAmount: true, date: true } },
            purchaseOrders: { select: { id: true, code: true, status: true, totalAmount: true, date: true, supplier: { select: { name: true } } } },
            purchaseBills: { select: { id: true, code: true, status: true, totalAmount: true, paidAmount: true, date: true, supplier: { select: { name: true } } } },
            purchasePayments: { select: { id: true, code: true, amount: true, date: true, supplier: { select: { name: true } } } },
            expenses: { select: { id: true, code: true, status: true, amount: true, date: true, description: true } },
            issues: {
                orderBy: { createdAt: 'desc' },
                include: {
                    reportedBy: { select: { id: true, name: true, avatar: true } },
                    assignedTo: { select: { id: true, name: true, avatar: true } }
                }
            },
            tasks: {
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
                    dispatch: { select: { id: true, title: true } },
                    dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true, dueDate: true } } } },
                    timeLogs: { include: { user: { include: { employeeProfile: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!project) notFound();

    if (!isViewAll && isViewOwn && userId) {
        const isRelated = project.creatorId === userId ||
            project.members.some((a: any) => a.userId === userId) ||
            project.tasks?.some((ct: any) =>
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
