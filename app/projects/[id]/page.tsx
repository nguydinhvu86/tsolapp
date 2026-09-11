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
            creator: { select: { id: true, name: true, avatar: true, email: true } },
            members: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
            topics: {
                orderBy: { createdAt: 'desc' },
                include: { creator: { select: { id: true, name: true, avatar: true } }, comments: { include: { user: { select: { id: true, name: true, avatar: true } }, reactions: true } } }
            },
            comments: {
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, name: true, avatar: true } }, reactions: true }
            },
            attachments: { 
                orderBy: { createdAt: 'desc' },
                include: { uploadedBy: { select: { id: true, name: true } } } 
            },
            customer: { select: { id: true, name: true, phone: true, email: true, code: true, address: true } },
            contract: { select: { id: true, title: true, status: true, createdAt: true } },
            quote: { select: { id: true, title: true, status: true, createdAt: true } },
            salesEstimate: { select: { id: true, code: true, status: true, totalAmount: true, date: true } },
            salesOrder: { select: { id: true, code: true, status: true, totalAmount: true, date: true } },
            invoice: { select: { id: true, code: true, status: true, totalAmount: true, paidAmount: true, date: true } },
            purchaseOrders: { 
                orderBy: { createdAt: 'desc' },
                include: { supplier: { select: { id: true, name: true, code: true } } } 
            },
            purchaseBills: { 
                orderBy: { createdAt: 'desc' },
                include: { supplier: { select: { id: true, name: true, code: true } } } 
            },
            purchasePayments: { 
                orderBy: { createdAt: 'desc' },
                include: { supplier: { select: { id: true, name: true, code: true } } } 
            },
            expenses: { 
                orderBy: { createdAt: 'desc' },
                include: { category: true } 
            },
            issues: {
                orderBy: { createdAt: 'desc' },
                include: {
                    reportedBy: { select: { id: true, name: true, avatar: true } },
                    assignedTo: { select: { id: true, name: true, avatar: true } }
                }
            },
            risks: {
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: { select: { id: true, name: true, avatar: true } }
                }
            },
            tasks: {
                include: {
                    assignees: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
                    creator: { select: { id: true, name: true, avatar: true } },
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

    // Fetch all related sales documents linked to this project
    const [extraEstimates, extraOrders, extraInvoices, extraQuotes, extraContracts] = await Promise.all([
        prisma.salesEstimate.findMany({
            where: {
                OR: [
                    { id: project.salesEstimateId || 'NONE' },
                    { projects: { some: { id: params.id } } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.salesOrder.findMany({
            where: {
                OR: [
                    { id: project.salesOrderId || 'NONE' },
                    { projects: { some: { id: params.id } } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.salesInvoice.findMany({
            where: {
                OR: [
                    { id: project.invoiceId || 'NONE' },
                    { projects: { some: { id: params.id } } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.quote.findMany({
            where: {
                OR: [
                    { id: project.quoteId || 'NONE' },
                    { projects: { some: { id: params.id } } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.contract.findMany({
            where: {
                OR: [
                    { id: project.contractId || 'NONE' },
                    { projects: { some: { id: params.id } } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        })
    ]);

    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, avatar: true },
        orderBy: { name: 'asc' }
    });

    // Merge transactions into project
    const mergedProject = {
        ...project,
        salesEstimates: extraEstimates,
        salesOrders: extraOrders,
        invoices: extraInvoices,
        quotes: extraQuotes,
        contracts: extraContracts
    };

    return <ProjectDetailClient project={mergedProject as any} users={users} />;
}
