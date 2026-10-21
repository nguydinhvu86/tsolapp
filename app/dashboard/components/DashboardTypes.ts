export interface WidgetRegistryItem {
    id: string;
    title: string;
    subtitle: string;
    category: 'finance' | 'sales' | 'operations';
    iconName: 'DollarSign' | 'Filter' | 'TrendingUp' | 'Users' | 'Trophy' | 'Receipt' | 'Target' | 'CheckCircle2' | 'Calendar';
    defaultVisible: boolean;
    adminOnly?: boolean;
}

export interface WidgetConfigItem {
    id: string;
    visible: boolean;
}

export const WIDGET_REGISTRY: WidgetRegistryItem[] = [
    {
        id: 'kpi_cards',
        title: 'Chỉ số Kinh doanh & Tài chính cốt lõi (KPIs)',
        subtitle: 'Doanh thu tháng, Hóa đơn phát hành, Thực thu và Công nợ so với tháng trước',
        category: 'finance',
        iconName: 'DollarSign',
        defaultVisible: true,
    },
    {
        id: 'sales_pipeline_funnel',
        title: 'Phễu Chuyển đổi & Tiến độ Bán hàng (Sales Funnel)',
        subtitle: 'Khách hàng tiềm năng (Leads) ➔ Chào giá (Quotes) ➔ Hóa đơn (Invoices) ➔ Thực thu',
        category: 'sales',
        iconName: 'Filter',
        defaultVisible: true,
    },
    {
        id: 'cash_flow_chart',
        title: 'Biểu đồ Dòng tiền & Chi phí 12 Tháng',
        subtitle: 'Đối soát Thu tiền bán hàng, Chi phí hoạt động và Thanh toán nhà cung cấp',
        category: 'finance',
        iconName: 'TrendingUp',
        defaultVisible: true,
    },
    {
        id: 'top_customers_chart',
        title: 'Top Khách hàng Doanh thu & Dư nợ lớn nhất',
        subtitle: 'Xếp hạng khách hàng đóng góp doanh số cao nhất và các khoản nợ cần ưu tiên thu hồi',
        category: 'sales',
        iconName: 'Users',
        defaultVisible: true,
    },
    {
        id: 'sales_performance_leaderboard',
        title: 'Bảng xếp hạng Hiệu suất Nhân viên Kinh doanh',
        subtitle: 'Thống kê doanh số chốt đơn, số báo giá thành công và số lead chăm sóc theo từng sales',
        category: 'sales',
        iconName: 'Trophy',
        defaultVisible: true,
    },
    {
        id: 'invoice_status_distribution',
        title: 'Tình trạng Hóa đơn & Thu hồi Công nợ',
        subtitle: 'Hóa đơn quá hạn thanh toán, hóa đơn sắp đến hạn và cơ cấu thanh toán',
        category: 'finance',
        iconName: 'Receipt',
        defaultVisible: true,
    },
    {
        id: 'my_leads_status',
        title: 'Cơ hội Bán hàng (Leads) & Tỷ lệ Chuyển đổi',
        subtitle: 'Danh sách cơ hội mới và phân bổ theo các giai đoạn chăm sóc',
        category: 'sales',
        iconName: 'Target',
        defaultVisible: true,
    },
    {
        id: 'my_work_todo',
        title: 'Công việc của tôi & Danh sách việc cần làm',
        subtitle: 'Quản lý tiến độ công việc được giao, mức độ khẩn cấp và Todo cá nhân',
        category: 'operations',
        iconName: 'CheckCircle2',
        defaultVisible: true,
    },
    {
        id: 'dashboard_calendar',
        title: 'Lịch biểu Điều hành & Sự kiện Kinh doanh',
        subtitle: 'Lịch hạn chót công việc, hạn báo giá và ngày đến hạn thanh toán hóa đơn',
        category: 'operations',
        iconName: 'Calendar',
        defaultVisible: true,
    },
];

export const DEFAULT_LAYOUT_ITEMS: WidgetConfigItem[] = WIDGET_REGISTRY.map(w => ({
    id: w.id,
    visible: w.defaultVisible,
}));

export function normalizeLayoutConfig(rawConfig: string | null | undefined): WidgetConfigItem[] {
    let parsed: any = null;
    try {
        if (rawConfig) {
            parsed = JSON.parse(rawConfig);
        }
    } catch (_) {}

    const result: WidgetConfigItem[] = [];
    const seenIds = new Set<string>();

    if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
            let widgetId = '';
            let isVisible = true;

            if (typeof item === 'string') {
                widgetId = item;
                isVisible = true;
            } else if (item && typeof item === 'object' && item.id) {
                widgetId = item.id;
                isVisible = item.visible !== false;
            }

            // Legacy migrate: 'charts_calendar' -> 'cash_flow_chart' & 'dashboard_calendar'
            if (widgetId === 'charts_calendar') {
                if (!seenIds.has('cash_flow_chart')) {
                    result.push({ id: 'cash_flow_chart', visible: isVisible });
                    seenIds.add('cash_flow_chart');
                }
                if (!seenIds.has('dashboard_calendar')) {
                    result.push({ id: 'dashboard_calendar', visible: isVisible });
                    seenIds.add('dashboard_calendar');
                }
                continue;
            }

            if (widgetId && WIDGET_REGISTRY.some(w => w.id === widgetId) && !seenIds.has(widgetId)) {
                result.push({ id: widgetId, visible: isVisible });
                seenIds.add(widgetId);
            }
        }
    }

    // Append any widgets from registry that were not present in saved config
    for (const widget of WIDGET_REGISTRY) {
        if (!seenIds.has(widget.id)) {
            result.push({ id: widget.id, visible: widget.defaultVisible });
            seenIds.add(widget.id);
        }
    }

    return result;
}
