'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    DollarSign,
    Receipt,
    CreditCard,
    Users,
    Briefcase,
    Plus,
    X,
    Calendar as CalendarIcon,
    ArrowRight,
    GripVertical,
    SlidersHorizontal,
    Eye,
    EyeOff,
    Check,
    Clock,
    Lock,
    Globe
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatMoney } from '@/lib/utils/formatters';

import {
    WidgetConfigItem,
    WIDGET_REGISTRY,
    normalizeLayoutConfig
} from './components/DashboardTypes';
import { DashboardCustomizeModal } from './components/DashboardCustomizeModal';
import { KPICardsWidget } from './components/KPICardsWidget';
import { SalesPipelineFunnelWidget } from './components/SalesPipelineFunnelWidget';
import { CashFlowChartWidget } from './components/CashFlowChartWidget';
import { TopCustomersWidget } from './components/TopCustomersWidget';
import { SalesLeaderboardWidget } from './components/SalesLeaderboardWidget';
import { InvoiceStatusDistributionWidget } from './components/InvoiceStatusDistributionWidget';
import { LeadDistributionWidget } from './components/LeadDistributionWidget';
import { MyWorkTodoCombinedWidget } from './components/MyWorkTodoCombinedWidget';
import { DashboardCalendar } from './DashboardCalendar';
import { AddEventModal } from './AddEventModal';
import { saveDashboardConfig } from '@/app/dashboard/actions';

interface DashboardClientProps {
    kpiData?: any;
    userTasks?: any[];
    quotes?: any[];
    invoices?: any[];
    leads?: any[];
    savedConfig?: string;
    users?: any[];
    currentEmployeeId?: string;
    currentUserId?: string;
    isAdminOrManager?: boolean;
}

export function DashboardClient({
    kpiData,
    userTasks = [],
    quotes = [],
    invoices = [],
    leads = [],
    savedConfig = '[]',
    users = [],
    currentEmployeeId = '',
    currentUserId = '',
    isAdminOrManager = false,
}: DashboardClientProps) {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    // Layout configuration state
    const [layout, setLayout] = useState<WidgetConfigItem[]>(() => {
        return normalizeLayoutConfig(savedConfig);
    });

    // Customization states
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [isDragReorderMode, setIsDragReorderMode] = useState(false);
    const [isSavingLayout, setIsSavingLayout] = useState(false);

    // Calendar selection states
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
    const [selectedCalendarTasks, setSelectedCalendarTasks] = useState<any[]>([]);
    const [selectedCalendarQuotes, setSelectedCalendarQuotes] = useState<any[]>([]);
    const [selectedCalendarInvoices, setSelectedCalendarInvoices] = useState<any[]>([]);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Filter tasks up to 10 days in the future
    const filteredTasks = useMemo(() => {
        if (!userTasks) return [];
        const threshold = new Date().getTime() + 10 * 24 * 60 * 60 * 1000;
        return userTasks.filter((task: any) => {
            if (task.startDate) {
                return new Date(task.startDate).getTime() <= threshold;
            }
            return true;
        });
    }, [userTasks]);

    // Save layout to database
    const persistLayout = async (newLayout: WidgetConfigItem[]) => {
        setLayout(newLayout);
        setIsSavingLayout(true);
        try {
            let targetUserId = currentUserId;
            if (!targetUserId) {
                const { getSession } = await import('next-auth/react');
                const session = await getSession();
                targetUserId = session?.user?.id || '';
            }

            if (targetUserId) {
                await saveDashboardConfig(targetUserId, JSON.stringify(newLayout));
            }
        } catch (error) {
            console.error('Failed to save dashboard layout:', error);
        } finally {
            setIsSavingLayout(false);
        }
    };

    // Drag-and-drop end handler
    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        // Reorder visible items
        const visibleItems = layout.filter(item => item.visible);
        const [movedItem] = visibleItems.splice(result.source.index, 1);
        visibleItems.splice(result.destination.index, 0, movedItem);

        // Merge back preserving hidden items order
        const hiddenItems = layout.filter(item => !item.visible);
        const newFullLayout = [...visibleItems, ...hiddenItems];

        await persistLayout(newFullLayout);
    };

    // Quick toggle hide single widget
    const handleHideWidget = async (widgetId: string) => {
        const updated = layout.map(item => item.id === widgetId ? { ...item, visible: false } : item);
        await persistLayout(updated);
    };

    // Calendar date click
    const handleDateClick = (date: Date, dayTasks: any[] = [], dayQuotes: any[] = [], dayInvoices: any[] = []) => {
        setSelectedCalendarDate(date);
        setSelectedCalendarTasks(dayTasks);
        setSelectedCalendarQuotes(dayQuotes);
        setSelectedCalendarInvoices(dayInvoices);
    };

    // Visible widgets for rendering
    const visibleWidgets = layout.filter(item => {
        if (!item.visible) return false;
        const meta = WIDGET_REGISTRY.find(w => w.id === item.id);
        if (meta?.adminOnly && !isAdminOrManager) return false;
        return true;
    });

    return (
        <div className="bg-gray-50/50 min-h-screen p-3.5 xl:p-6 pt-3 xl:pt-4">
            <div className="w-full mx-auto space-y-5 pb-8">
                {/* Dashboard Header Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2 -mx-1 md:mx-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                Bảng Điều Khiển
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200/80 text-slate-700">
                                ERP / CRM
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Tổng quan hoạt động kinh doanh, tài chính và điều hành doanh nghiệp
                        </p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-col sm:flex-row md:items-center items-stretch gap-2 w-full md:w-auto">
                        {/* Quick Shortcuts */}
                        <div className="flex items-center gap-1.5 mr-1">
                            <Link
                                href="/sales/estimates/new"
                                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors border border-emerald-200/60 shadow-2xs"
                            >
                                <Receipt size={14} className="shrink-0" />
                                <span className="whitespace-nowrap">Báo giá mới</span>
                            </Link>
                            <Link
                                href="/customers"
                                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors border border-blue-200/60 shadow-2xs"
                            >
                                <Users size={14} className="shrink-0" />
                                <span className="whitespace-nowrap">Khách hàng</span>
                            </Link>
                            <button
                                onClick={() => setIsAddEventModalOpen(true)}
                                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors border border-indigo-200/60 shadow-2xs"
                            >
                                <Briefcase size={14} className="shrink-0" />
                                <span className="whitespace-nowrap">Giao việc</span>
                            </button>
                        </div>

                        {/* Employee Filter (Admin / Manager) */}
                        {isAdminOrManager && users && users.length > 0 && (
                            <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Xem theo:</span>
                                <select
                                    className="flex-1 sm:flex-none px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                                    value={currentEmployeeId || ''}
                                    onChange={(e) => {
                                        const newEmployeeId = e.target.value;
                                        const params = new URLSearchParams(window.location.search);
                                        if (newEmployeeId) {
                                            params.set('employeeId', newEmployeeId);
                                        } else {
                                            params.delete('employeeId');
                                        }
                                        router.push(`/dashboard?${params.toString()}`);
                                    }}
                                >
                                    <option value="">Tất cả nhân viên (Công ty)</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Mode Toggle: In-place Drag Reordering */}
                        <button
                            type="button"
                            onClick={() => setIsDragReorderMode(!isDragReorderMode)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all border flex items-center justify-center gap-1.5 shadow-2xs ${
                                isDragReorderMode
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                            title="Kéo thả trực tiếp các biểu đồ trên màn hình"
                        >
                            <GripVertical size={14} />
                            <span>{isDragReorderMode ? 'Xong sắp xếp' : 'Sắp xếp'}</span>
                        </button>

                        {/* Main Customizer Button: Opens Comprehensive Modal */}
                        <button
                            type="button"
                            onClick={() => setIsCustomizeModalOpen(true)}
                            className="px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                            <SlidersHorizontal size={14} />
                            <span>Tùy chỉnh Dashboard</span>
                        </button>
                    </div>
                </div>

                {/* Banner when in Drag Reorder Mode */}
                {isDragReorderMode && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="font-bold">Chế độ sắp xếp bố cục:</span>
                            <span>Kéo thả thanh tiêu đề từng widget để đổi vị trí, hoặc bấm nút &quot;Ẩn&quot; để tắt widget.</span>
                        </div>
                        <button
                            onClick={() => setIsDragReorderMode(false)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0"
                        >
                            Hoàn tất & Lưu
                        </button>
                    </div>
                )}

                {/* Widgets Container */}
                {isMounted ? (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="dashboard-widgets">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-5">
                                    {visibleWidgets.map((item, index) => {
                                        const meta = WIDGET_REGISTRY.find(w => w.id === item.id);
                                        const widgetTitle = meta?.title || item.id;

                                        return (
                                            <Draggable
                                                key={item.id}
                                                draggableId={item.id}
                                                index={index}
                                                isDragDisabled={!isDragReorderMode}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`transition-all ${
                                                            snapshot.isDragging
                                                                ? 'opacity-90 z-50 rounded-2xl shadow-2xl scale-[1.01]'
                                                                : ''
                                                        } ${
                                                            isDragReorderMode
                                                                ? 'ring-2 ring-dashed ring-amber-400/80 bg-amber-50/20 p-2 sm:p-3 rounded-2xl relative'
                                                                : ''
                                                        }`}
                                                    >
                                                        {/* Reorder Mode Controls Header */}
                                                        {isDragReorderMode && (
                                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60 bg-amber-50/80 px-3 py-1.5 rounded-lg">
                                                                <div
                                                                    {...provided.dragHandleProps}
                                                                    className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-grab active:cursor-grabbing select-none"
                                                                >
                                                                    <GripVertical size={16} className="text-amber-700" />
                                                                    <span>#{index + 1}. {widgetTitle}</span>
                                                                    <span className="text-[11px] font-normal text-amber-700">(Kéo thả tại đây)</span>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleHideWidget(item.id)}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-100/70 px-2 py-0.5 rounded transition-colors"
                                                                    title="Ẩn widget này"
                                                                >
                                                                    <EyeOff size={13} />
                                                                    <span>Ẩn widget</span>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Widget 1: KPI Cards */}
                                                        {item.id === 'kpi_cards' && (
                                                            <KPICardsWidget
                                                                revenueThisMonth={kpiData?.revenueThisMonth || 0}
                                                                revenueLastMonth={kpiData?.revenueLastMonth || 0}
                                                                invoicesThisMonth={kpiData?.invoicesThisMonth || 0}
                                                                invoicesLastMonth={kpiData?.invoicesLastMonth || 0}
                                                                paymentsThisMonth={kpiData?.paymentsThisMonth || 0}
                                                                paymentsLastMonth={kpiData?.paymentsLastMonth || 0}
                                                                debtThisMonth={kpiData?.debtThisMonth || 0}
                                                                debtLastMonth={kpiData?.debtLastMonth || 0}
                                                            />
                                                        )}

                                                        {/* Widget 2: Sales Funnel */}
                                                        {item.id === 'sales_pipeline_funnel' && (
                                                            <SalesPipelineFunnelWidget
                                                                leads={leads}
                                                                quotes={quotes}
                                                                invoices={invoices}
                                                                paymentsThisMonth={kpiData?.paymentsThisMonth || 0}
                                                            />
                                                        )}

                                                        {/* Widget 3: Cash Flow Chart */}
                                                        {item.id === 'cash_flow_chart' && (
                                                            <CashFlowChartWidget
                                                                cashFlow={kpiData?.cashFlow || []}
                                                            />
                                                        )}

                                                        {/* Widget 4: Top Customers */}
                                                        {item.id === 'top_customers_chart' && (
                                                            <TopCustomersWidget
                                                                invoices={invoices}
                                                            />
                                                        )}

                                                        {/* Widget 5: Sales Leaderboard */}
                                                        {item.id === 'sales_performance_leaderboard' && (
                                                            <SalesLeaderboardWidget
                                                                invoices={invoices}
                                                                quotes={quotes}
                                                                leads={leads}
                                                                users={users}
                                                            />
                                                        )}

                                                        {/* Widget 6: Invoice Status Distribution */}
                                                        {item.id === 'invoice_status_distribution' && (
                                                            <InvoiceStatusDistributionWidget
                                                                invoices={invoices}
                                                            />
                                                        )}

                                                        {/* Widget 7: Leads Status Distribution */}
                                                        {item.id === 'my_leads_status' && (
                                                            <LeadDistributionWidget
                                                                leads={leads}
                                                            />
                                                        )}

                                                        {/* Widget 8: My Work & Todo */}
                                                        {item.id === 'my_work_todo' && (
                                                            <MyWorkTodoCombinedWidget
                                                                tasks={filteredTasks}
                                                            />
                                                        )}

                                                        {/* Widget 9: Dashboard Calendar */}
                                                        {item.id === 'dashboard_calendar' && (
                                                            <div className="w-full">
                                                                <div className="border border-slate-200/90 rounded-2xl shadow-2xs bg-white overflow-hidden flex flex-col">
                                                                    <DashboardCalendar
                                                                        tasks={filteredTasks}
                                                                        quotes={quotes || []}
                                                                        invoices={invoices || []}
                                                                        onDateClick={handleDateClick}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                ) : (
                    <div className="flex flex-col gap-5 animate-pulse mt-4">
                        <div className="h-32 bg-slate-200 rounded-2xl" />
                        <div className="h-80 bg-slate-200 rounded-2xl" />
                        <div className="h-80 bg-slate-200 rounded-2xl" />
                    </div>
                )}
            </div>

            {/* Customization Modal */}
            <DashboardCustomizeModal
                isOpen={isCustomizeModalOpen}
                onClose={() => setIsCustomizeModalOpen(false)}
                currentLayout={layout}
                onSave={persistLayout}
                isAdminOrManager={isAdminOrManager}
            />

            {/* Calendar Day Detail Modal */}
            {selectedCalendarDate && (
                <div className="modal-backdrop" style={{ zIndex: 99999 }}>
                    <div className="w-full mx-auto bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ maxWidth: '650px', maxHeight: '90vh' }}>
                        <div className="px-6 py-5 flex justify-between items-start bg-white relative z-10 shrink-0 border-b border-slate-100">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2.5 text-slate-900">
                                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                        <CalendarIcon className="w-5 h-5 stroke-[2.5px]" />
                                    </div>
                                    Lịch trình ngày {format(selectedCalendarDate, 'dd/MM/yyyy')}
                                </h3>
                                <p className="text-sm font-medium mt-1.5 ml-[46px] text-slate-500">
                                    {selectedCalendarTasks.length + selectedCalendarQuotes.length + selectedCalendarInvoices.length} sự kiện & công việc trong ngày
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedCalendarDate(null)}
                                className="p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 custom-scrollbar">
                            {(selectedCalendarTasks.length === 0 && selectedCalendarQuotes.length === 0 && selectedCalendarInvoices.length === 0) ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                        <CalendarIcon className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-600 font-bold text-base">Không có sự kiện nào</p>
                                    <p className="text-slate-400 text-xs mt-1">Ngày này chưa có công việc hay hạn giao dịch nào.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {/* Invoices */}
                                    {selectedCalendarInvoices.map(invoice => (
                                        <div
                                            key={`inv-${invoice.id}`}
                                            className="rounded-xl p-4 bg-white border border-slate-200 border-l-4 border-l-orange-500 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
                                            onClick={() => router.push(`/sales/invoices/${invoice.id}`)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm text-slate-900 truncate">Hóa đơn: {invoice.code}</h4>
                                                    {invoice.customer && (
                                                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                                                            <Users className="w-3.5 h-3.5" />
                                                            <span className="truncate">{invoice.customer.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-slate-200">
                                                <div className="font-mono font-bold text-sm text-orange-600">
                                                    {formatMoney(invoice.totalAmount)}
                                                </div>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                                                    {invoice.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Quotes */}
                                    {selectedCalendarQuotes.map(quote => (
                                        <div
                                            key={`quo-${quote.id}`}
                                            className="rounded-xl p-4 bg-white border border-slate-200 border-l-4 border-l-emerald-500 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
                                            onClick={() => router.push(`/sales/estimates/${quote.id}`)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm text-slate-900 truncate">Báo giá: {quote.code}</h4>
                                                    {quote.customer && (
                                                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                                                            <Users className="w-3.5 h-3.5" />
                                                            <span className="truncate">{quote.customer.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-slate-200">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{format(new Date(quote.createdAt), 'HH:mm', { locale: vi })}</span>
                                                </div>
                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {quote.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Tasks */}
                                    {selectedCalendarTasks.map(task => (
                                        <div
                                            key={`task-${task.id}`}
                                            className="rounded-xl p-4 bg-white border border-slate-200 border-l-4 border-l-indigo-500 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col gap-3"
                                            onClick={() => router.push(`/tasks/${task.id}`)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-tight">{task.title}</h4>
                                                    {task.customer && (
                                                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                                                            <Users className="w-3.5 h-3.5" />
                                                            <span className="truncate">{task.customer.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                        {task.priority === 'URGENT' ? 'KHẨN CẤP' : task.priority === 'HIGH' ? 'CAO' : task.priority === 'MEDIUM' ? 'TRUNG BÌNH' : 'THẤP'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-slate-200">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{format(new Date(task.dueDate), 'HH:mm', { locale: vi })}</span>
                                                </div>
                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                                    {task.status === 'TODO' ? 'Cần làm' : task.status === 'IN_PROGRESS' ? 'Đang làm' : task.status === 'REVIEW' ? 'Chờ duyệt' : 'Hoàn thành'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 sm:p-5 flex justify-end gap-3 shrink-0 bg-white border-t border-slate-100">
                            <button
                                onClick={() => setIsAddEventModalOpen(true)}
                                className="font-bold text-xs py-2 px-5 rounded-xl flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-2xs"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Thêm sự kiện / Công việc</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Event Modal */}
            <AddEventModal
                isOpen={isAddEventModalOpen}
                initialDate={selectedCalendarDate}
                onClose={() => setIsAddEventModalOpen(false)}
                onSuccess={() => {
                    router.refresh();
                }}
            />
        </div>
    );
}
