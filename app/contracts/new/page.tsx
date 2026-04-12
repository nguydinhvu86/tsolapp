import { prisma } from '@/lib/prisma';
import { NewContractClient } from './NewContractClient';

export default async function NewContractPage({ searchParams }: { searchParams: { customerId?: string } }) {
    const templates = await prisma.contractTemplate.findMany({ orderBy: { name: 'asc' } });
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
    const projects = await prisma.project.findMany({ select: { id: true, name: true } });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1>Tạo Mới Hợp Đồng</h1>
            </div>
            <NewContractClient templates={templates} customers={customers} projects={projects} preselectedCustomerId={searchParams?.customerId} />
        </div>
    );
}
