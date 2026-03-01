import { prisma } from '@/lib/prisma';
import { ContractDashboardClient } from './ContractDashboardClient';
import Link from 'next/link';

export default async function ContractsPage() {
    const contracts = await prisma.contract.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            customer: true,
            template: true
        }
    });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1>Quản lý Hợp đồng đã tạo</h1>
            </div>
            <ContractDashboardClient initialData={contracts} />
        </div>
    );
}
