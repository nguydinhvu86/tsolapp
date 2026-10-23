'use server'

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { 
    getRollingCashFlowForecast, 
    getAgingDebtReport, 
    getProjectProfitabilityAnalysis, 
    getExecutiveMetrics 
} from '@/lib/executive-bi';

export async function fetchExecutiveBiData() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Phiên đăng nhập không hợp lệ.'
            };
        }

        const role = (session.user.role || '').toUpperCase();
        const permissions = (session.user.permissions as string[]) || [];
        const isManagerOrAbove =
            ['ADMIN', 'MANAGER', 'DIRECTOR', 'CEO', 'CFO', 'LEADER'].includes(role) ||
            permissions.includes('VIEW_EXECUTIVE_BI');

        if (!isManagerOrAbove) {
            return {
                success: false,
                error: 'Chỉ cấp độ Quản lý trở lên mới có quyền xem Executive BI & Dự Báo.'
            };
        }

        const [cashFlow, agingCustomers, agingSuppliers, projectProfitability, executiveMetrics] = await Promise.all([
            getRollingCashFlowForecast(),
            getAgingDebtReport('CUSTOMER'),
            getAgingDebtReport('SUPPLIER'),
            getProjectProfitabilityAnalysis(),
            getExecutiveMetrics()
        ]);

        return {
            success: true,
            data: {
                cashFlow,
                agingDebts: {
                    receivables: agingCustomers.summary,
                    payables: agingSuppliers.summary
                },
                projectProfitability,
                executiveMetrics
            }
        };
    } catch (error: any) {
        console.error('Lỗi khi tải dữ liệu Executive BI:', error);
        return {
            success: false,
            error: error.message || 'Không thể tải dữ liệu điều hành BI'
        };
    }
}
