'use server'

import { 
    getRollingCashFlowForecast, 
    getAgingDebtReport, 
    getProjectProfitabilityAnalysis, 
    getExecutiveMetrics 
} from '@/lib/executive-bi';

export async function fetchExecutiveBiData() {
    try {
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
