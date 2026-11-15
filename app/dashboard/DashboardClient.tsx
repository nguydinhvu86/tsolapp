'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    DollarSign,
    CreditCard,
    Users,
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
    Globe,
    RotateCw,
    StickyNote,
    Sparkles,
    CheckSquare,
    AlertTriangle,
    FileText,
    CalendarDays,
    Compass,
    Megaphone,
    BellRing
} from 'lucide-react';
import { toast } from '@/app/components/providers/ToastProvider';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { formatMoney } from '@/lib/utils/formatters';

import {
    WidgetConfigItem,
    WIDGET_REGISTRY,
    normalizeLayoutConfig
} from './components/DashboardTypes';
import {
    DashboardPeriodFilter,
    PeriodFilterState,
    getDefaultPeriodFilter
} from './components/DashboardPeriodFilter';
import { DashboardCustomizeModal } from './components/DashboardCustomizeModal';
import { KPICardsWidget } from './components/KPICardsWidget';
import { BulletinBoardWidget } from './components/BulletinBoardWidget';
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
    userName?: string;
    userRole?: string;
    userPermissions?: string[];
    activities?: any[];
    announcements?: any[];
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
    userName = 'Bạn',
    userRole = '',
    userPermissions = [],
    activities = [],
    announcements = [],
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

    // Period filters for widgets (Default to Current Month)
    const [globalPeriodFilter, setGlobalPeriodFilter] = useState<PeriodFilterState>(getDefaultPeriodFilter);
    const [funnelPeriodFilter, setFunnelPeriodFilter] = useState<PeriodFilterState>(getDefaultPeriodFilter);
    const [topCustPeriodFilter, setTopCustPeriodFilter] = useState<PeriodFilterState>(getDefaultPeriodFilter);
    const [invoicePeriodFilter, setInvoicePeriodFilter] = useState<PeriodFilterState>(getDefaultPeriodFilter);

    // Synchronize all 3 widgets when changing global period filter
    const handleGlobalPeriodChange = (newPeriod: PeriodFilterState) => {
        setGlobalPeriodFilter(newPeriod);
        setFunnelPeriodFilter(newPeriod);
        setTopCustPeriodFilter(newPeriod);
        setInvoicePeriodFilter(newPeriod);
    };

    // Personal scratchpad & quick focus states
    const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
    const [scratchpadText, setScratchpadText] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeHighlightedWidget, setActiveHighlightedWidget] = useState<string | null>(null);

    // Bulletin board toggle state
    const [isBulletinOpen, setIsBulletinOpen] = useState(false);

    // Filter urgent announcements for high-priority notification banner
    const urgentAnnouncements = useMemo(() => {
        return (announcements || []).filter((a: any) => a.isUrgent);
    }, [announcements]);
    const latestUrgent = urgentAnnouncements[0];

    useEffect(() => {
        try {
            const saved = localStorage.getItem('dashboard_personal_scratchpad');
            if (saved) setScratchpadText(saved);
        } catch (_) {}
    }, []);

    const handleSaveScratchpad = (val: string) => {
        setScratchpadText(val);
        try {
            localStorage.setItem('dashboard_personal_scratchpad', val);
        } catch (_) {}
    };

    const handleLiveRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => {
            setIsRefreshing(false);
            toast.success('Dữ liệu Dashboard đã được làm mới!');
        }, 600);
    };

    const scrollToWidget = (widgetId: string) => {
        const el = document.getElementById(`widget-${widgetId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setActiveHighlightedWidget(widgetId);
            setTimeout(() => {
                setActiveHighlightedWidget(null);
            }, 2000);
        }
    };

    // Calculate urgency metrics
    const nowTime = useMemo(() => new Date().getTime(), []);
    const urgentTasks = useMemo(() => {
        return (userTasks || []).filter(t => {
            if (t.status === 'DONE' || t.status === 'CANCELLED') return false;
            if (!t.dueDate) return false;
            return new Date(t.dueDate).getTime() <= (nowTime + 24 * 60 * 60 * 1000);
        });
    }, [userTasks, nowTime]);

    const overdueInvoices = useMemo(() => {
        return (invoices || []).filter(inv => {
            if (inv.status === 'PAID' || inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;
            if (!inv.dueDate) return false;
            return new Date(inv.dueDate).getTime() < nowTime;
        });
    }, [invoices, nowTime]);

    const openQuotes = useMemo(() => {
        return (quotes || []).filter(q => q.status === 'SENT' || q.status === 'DRAFT');
    }, [quotes]);

    const todayEventsCount = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const isToday = (d: any) => d ? format(new Date(d), 'yyyy-MM-dd') === todayStr : false;
        const taskCount = (userTasks || []).filter(t => isToday(t.dueDate)).length;
        const quoteCount = (quotes || []).filter(q => isToday(q.validUntil) || isToday(q.date)).length;
        const invoiceCount = (invoices || []).filter(i => isToday(i.dueDate)).length;
        return taskCount + quoteCount + invoiceCount;
    }, [userTasks, quotes, invoices]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    }, []);

    const dayOfWeekStr = useMemo(() => {
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const d = new Date();
        return `${days[d.getDay()]}, ${format(d, 'dd/MM/yyyy')}`;
    }, []);

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
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-1 -mx-1 md:mx-0">
                    <div className="shrink-0 min-w-fit">
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
                                Bảng Điều Khiển
                            </h1>
                            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
                                ERP / CRM
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 whitespace-nowrap hidden sm:block font-medium">
                            Tổng quan hoạt động kinh doanh, tài chính và điều hành doanh nghiệp
                        </p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                        {/* Employee Filter (Admin / Manager) */}
                        {isAdminOrManager && users && users.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Xem theo:</span>
                                <select
                                    className="h-[34px] px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 shadow-2xs cursor-pointer max-w-[210px] transition-colors"
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

                        {/* Global Period Filter: Synchronizes Funnel, Top Customers, and Invoices widgets */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Thời gian:</span>
                            <DashboardPeriodFilter
                                value={globalPeriodFilter}
                                onChange={handleGlobalPeriodChange}
                                align="right"
                                buttonClassName="h-[34px] bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold whitespace-nowrap rounded-xl shadow-2xs"
                            />
                        </div>

                        {/* Mode Toggle: In-place Drag Reordering */}
                        <button
                            type="button"
                            onClick={() => setIsDragReorderMode(!isDragReorderMode)}
                            className={`h-[34px] px-3.5 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer ${
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
                            className="h-[34px] px-3.5 rounded-xl font-bold text-xs transition-all border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                        >
                            <SlidersHorizontal size={14} />
                            <span>Tùy chỉnh Dashboard</span>
                        </button>
                    </div>
                </div>

                {/* Daily Focus & Command Bar (Smart Greeting, Urgent Metrics & Quick Scratchpad) */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3.5">
                    {/* Row 1: Greeting + Date + Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                <Sparkles size={20} strokeWidth={2.2} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                        {greeting}, <span className="text-emerald-700">{userName}</span>!
                                    </h2>
                                    {userRole && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                            {userRole === 'ADMIN' ? 'Ban Giám Đốc / Admin' : userRole === 'MANAGER' ? 'Quản Lý' : 'Chuyên Viên'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                                    <span className="text-slate-700 font-semibold">{dayOfWeekStr}</span>
                                    <span>•</span>
                                    <span className="text-slate-500 hidden sm:inline">Chúc bạn một ngày làm việc tràn đầy năng lượng & hiệu quả!</span>
                                </p>

                                {/* Cảnh báo Thông báo khẩn cấp ngay dưới dòng Chào Buổi sáng */}
                                {latestUrgent && (
                                    <div
                                        onClick={() => setIsBulletinOpen(true)}
                                        className="mt-2.5 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-rose-400 bg-rose-50/90 hover:bg-rose-100/90 text-rose-950 bulletin-urgent-active cursor-pointer transition-all shadow-xs group max-w-full"
                                        title="Nhấn để mở Bảng tin xem chi tiết thông báo khẩn cấp"
                                    >
                                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shrink-0 shadow-2xs flex items-center gap-1">
                                            <BellRing size={11} className="animate-bounce" />
                                            <span>THÔNG BÁO KHẨN CẤP</span>
                                        </span>
                                        <span className="text-xs font-bold text-rose-950 truncate max-w-xs sm:max-w-md md:max-w-lg group-hover:text-rose-700 transition-colors">
                                            {latestUrgent.title}
                                        </span>
                                        {urgentAnnouncements.length > 1 && (
                                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900 shrink-0">
                                                +{urgentAnnouncements.length - 1} khác
                                            </span>
                                        )}
                                        <span className="text-[11px] font-bold text-rose-700 shrink-0 inline-flex items-center gap-0.5 ml-1">
                                            <span className="hidden sm:inline">Xem ngay</span>
                                            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live Refresh, Bulletin Board & Quick Scratchpad Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={handleLiveRefresh}
                                disabled={isRefreshing}
                                className="h-[32px] px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
                                title="Làm mới toàn bộ dữ liệu chỉ số"
                            >
                                <RotateCw size={13} className={`text-slate-500 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
                                <span>{isRefreshing ? 'Đang cập nhật...' : 'Làm mới số liệu'}</span>
                            </button>

                            {/* Toggle Bulletin Button (Kế bên Làm mới số liệu) */}
                            <button
                                type="button"
                                onClick={() => setIsBulletinOpen(!isBulletinOpen)}
                                className={`h-[32px] px-3 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                                    isBulletinOpen
                                        ? 'bg-indigo-600 text-white border border-indigo-700 shadow-xs'
                                        : latestUrgent
                                        ? 'text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 bulletin-urgent-active'
                                        : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80'
                                }`}
                                title="Mở hoặc đóng Bảng tin Bulletin"
                            >
                                <Megaphone size={13} className={isBulletinOpen ? 'text-white' : latestUrgent ? 'text-rose-600 animate-bounce' : 'text-indigo-600'} />
                                <span>{isBulletinOpen ? 'Đóng bảng tin' : 'Bảng tin Bulletin'}</span>
                                {latestUrgent ? (
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                                    </span>
                                ) : announcements.length > 0 ? (
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/80 text-indigo-700 border border-indigo-200/60">
                                        {announcements.length}
                                    </span>
                                ) : null}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsScratchpadOpen(!isScratchpadOpen)}
                                className={`h-[32px] px-3 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                                    isScratchpadOpen 
                                        ? 'bg-amber-500 text-white border border-amber-600 shadow-xs' 
                                        : 'text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80'
                                }`}
                                title="Mở sổ ghi chú nhanh cá nhân"
                            >
                                <StickyNote size={13} className={isScratchpadOpen ? 'text-white' : 'text-amber-600'} />
                                <span>{isScratchpadOpen ? 'Đóng sổ tay' : 'Sổ ghi chú nhanh'}</span>
                                {scratchpadText.trim() && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Row 2: 4 Daily Focus KPI Chips (Click to drill down) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <button
                            type="button"
                            onClick={() => scrollToWidget('my_work_todo')}
                            className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-300 transition-all text-left group cursor-pointer"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <CheckSquare size={16} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-semibold text-slate-500 truncate">Việc gấp / Đến hạn</div>
                                    <div className="text-sm font-bold font-mono text-slate-900 group-hover:text-indigo-700">
                                        {urgentTasks.length} <span className="text-[11px] font-sans font-normal text-slate-500">công việc</span>
                                    </div>
                                </div>
                            </div>
                            <ArrowRight size={13} className="text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                        </button>

                        <button
                            type="button"
                            onClick={() => scrollToWidget('invoice_status_distribution')}
                            className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50/80 hover:bg-rose-50/70 border border-slate-200/80 hover:border-rose-300 transition-all text-left group cursor-pointer"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-rose-100/80 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <AlertTriangle size={16} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-semibold text-slate-500 truncate">Hóa đơn quá hạn nợ</div>
                                    <div className="text-sm font-bold font-mono text-slate-900 group-hover:text-rose-700">
                                        {overdueInvoices.length} <span className="text-[11px] font-sans font-normal text-slate-500">hóa đơn</span>
                                    </div>
                                </div>
                            </div>
                            <ArrowRight size={13} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                        </button>

                        <button
                            type="button"
                            onClick={() => scrollToWidget('sales_pipeline_funnel')}
                            className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50/80 hover:bg-purple-50/70 border border-slate-200/80 hover:border-purple-300 transition-all text-left group cursor-pointer"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <FileText size={16} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-semibold text-slate-500 truncate">Báo giá đang mở</div>
                                    <div className="text-sm font-bold font-mono text-slate-900 group-hover:text-purple-700">
                                        {openQuotes.length} <span className="text-[11px] font-sans font-normal text-slate-500">báo giá</span>
                                    </div>
                                </div>
                            </div>
                            <ArrowRight size={13} className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                        </button>

                        <button
                            type="button"
                            onClick={() => scrollToWidget('dashboard_calendar')}
                            className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50/80 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-300 transition-all text-left group cursor-pointer"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <CalendarDays size={16} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[11px] font-semibold text-slate-500 truncate">Lịch trình hôm nay</div>
                                    <div className="text-sm font-bold font-mono text-slate-900 group-hover:text-emerald-700">
                                        {todayEventsCount} <span className="text-[11px] font-sans font-normal text-slate-500">sự kiện</span>
                                    </div>
                                </div>
                            </div>
                            <ArrowRight size={13} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                        </button>
                    </div>

                    {/* Collapsible Personal Scratchpad Card */}
                    {isScratchpadOpen && (
                        <div className="pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60">
                                    <div className="flex items-center gap-2">
                                        <StickyNote size={15} className="text-amber-700" />
                                        <span className="text-xs font-bold text-amber-900">Sổ Nháp Cá Nhân (Tự Động Lưu)</span>
                                        <span className="text-[11px] text-amber-700 font-normal hidden sm:inline">• Lưu nhanh số điện thoại, ghi chú cuộc gọi, ý tưởng trong ngày</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {scratchpadText.trim() && (
                                            <button
                                                type="button"
                                                onClick={() => handleSaveScratchpad('')}
                                                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold px-2 py-0.5 rounded hover:bg-rose-100/60 transition-colors"
                                            >
                                                Xóa nháp
                                            </button>
                                        )}
                                        <span className="text-[10.5px] font-mono text-amber-700">{scratchpadText.length} ký tự</span>
                                    </div>
                                </div>
                                <textarea
                                    rows={3}
                                    value={scratchpadText}
                                    onChange={(e) => handleSaveScratchpad(e.target.value)}
                                    placeholder="Viết nhanh ghi chú của bạn tại đây... (Ví dụ: Gọi lại anh Tuấn 0912xxx lúc 15h30, cần gửi mẫu hợp đồng cho bên Tân Cảng...)"
                                    className="w-full text-xs text-slate-800 bg-white/90 border border-amber-200 rounded-lg p-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400/50 resize-y font-sans transition-all placeholder:text-amber-700/50"
                                />
                            </div>
                        </div>
                    )}

                    {/* Quick Jump Anchor Navigator */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                            <Compass size={12} className="text-slate-400" /> Đến nhanh:
                        </span>
                        {[
                            { id: 'kpi_cards', label: 'Chỉ số cốt lõi', icon: '📊' },
                            { id: 'sales_pipeline_funnel', label: 'Phễu bán hàng', icon: '🎯' },
                            { id: 'cash_flow_chart', label: 'Dòng tiền 12T', icon: '💰' },
                            { id: 'top_customers_chart', label: 'Top Khách hàng', icon: '🏢' },
                            { id: 'sales_performance_leaderboard', label: 'Bảng vinh danh', icon: '🏆' },
                            { id: 'invoice_status_distribution', label: 'Thu nợ', icon: '⚠️' },
                            { id: 'my_leads_status', label: 'Khách tiềm năng', icon: '👥' },
                            { id: 'my_work_todo', label: 'Việc của tôi', icon: '📋' },
                            { id: 'dashboard_calendar', label: 'Lịch công tác', icon: '📅' },
                        ].filter(nav => visibleWidgets.some(w => w.id === nav.id)).map(nav => (
                            <button
                                key={nav.id}
                                type="button"
                                onClick={() => scrollToWidget(nav.id)}
                                className="h-[26px] px-2.5 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-100/80 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/70 transition-all shrink-0 inline-flex items-center gap-1 cursor-pointer"
                            >
                                <span>{nav.icon}</span>
                                <span>{nav.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Collapsible Bulletin Board (Mở/Đóng từ nút kế bên Làm mới số liệu hoặc click cảnh báo khẩn cấp) */}
                {isBulletinOpen && (
                    <div id="bulletin_board_collapsible" className="animate-in fade-in slide-in-from-top-3 duration-200">
                        <BulletinBoardWidget
                            activities={activities}
                            announcements={announcements}
                            isAdminOrManager={isAdminOrManager}
                            userPermissions={userPermissions}
                            userRole={userRole}
                            currentUserId={currentUserId}
                            userName={userName}
                            onClose={() => setIsBulletinOpen(false)}
                        />
                    </div>
                )}

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
                                                        id={`widget-${item.id}`}
                                                        className={`transition-all duration-300 ${
                                                            snapshot.isDragging
                                                                ? 'opacity-90 z-50 rounded-2xl shadow-2xl scale-[1.01]'
                                                                : ''
                                                        } ${
                                                            isDragReorderMode
                                                                ? 'ring-2 ring-dashed ring-amber-400/80 bg-amber-50/20 p-2 sm:p-3 rounded-2xl relative'
                                                                : ''
                                                        } ${
                                                            activeHighlightedWidget === item.id
                                                                ? 'ring-4 ring-emerald-500/80 ring-offset-2 rounded-2xl shadow-xl'
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
                                                                periodFilter={funnelPeriodFilter}
                                                                onPeriodFilterChange={setFunnelPeriodFilter}
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
                                                                periodFilter={topCustPeriodFilter}
                                                                onPeriodFilterChange={setTopCustPeriodFilter}
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
                                                                periodFilter={invoicePeriodFilter}
                                                                onPeriodFilterChange={setInvoicePeriodFilter}
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
