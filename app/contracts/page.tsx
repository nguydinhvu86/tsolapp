import { prisma } from '@/lib/prisma';
import { ContractDashboardClient } from './ContractDashboardClient';
import Link from 'next/link';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { buildViewFilter } from '@/lib/permissions';

export default async function ContractsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div>Unauthorized</div>;
    const permissions = session.user.permissions || [];

    const viewFilter = buildViewFilter(session.user.id, permissions, 'CONTRACTS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') {
        return <div className="p-8 text-center text-red-500 font-bold">Bạn không có quyền truy cập trang này.</div>;
    }

    const contracts = await prisma.contract.findMany({
        where: viewFilter,
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
