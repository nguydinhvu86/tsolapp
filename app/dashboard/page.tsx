import { getDashboardStats } from './actions';
import { DashboardClient } from './DashboardClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const data = await getDashboardStats();

    if (!data) {
        return <div className="p-8">Đã xảy ra lỗi khi tải dữ liệu thống kê.</div>;
    }

    return <DashboardClient initialData={data} />;
}
