import { getCustomerWithRelations } from './actions';
import { CustomerDetailClient } from './CustomerDetailClient';
import { prisma } from '@/lib/prisma';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';

export const dynamic = 'force-dynamic';

import { getTemplatesByModule } from '@/app/email-templates/actions';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    let savedMenuOrder = "[]";
    if (session?.user?.id) {
        const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { customerMenuOrder: true } });
        savedMenuOrder = user?.customerMenuOrder || "[]";
    }

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

    const debtTemplates = await getTemplatesByModule('DEBT_CONFIRMATION');
    const generalTemplates = await getTemplatesByModule('GENERAL');
    const allTemplates = [...debtTemplates, ...generalTemplates];

    return (
        <div style={{ padding: '1.5rem', maxWidth: '100%', margin: '0 auto' }}>
            <CustomerDetailClient customer={customer} tasks={tasks} users={users} emailTemplates={allTemplates} savedMenuOrder={savedMenuOrder} />
        </div>
    );
}
