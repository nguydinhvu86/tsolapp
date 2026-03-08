'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Receipt, CreditCard, Users, Box, Briefcase, Plus, X, CheckCircle2, Circle, Clock, CheckCheck, Calendar as CalendarIcon, Globe, Lock } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { DashboardCalendar } from './DashboardCalendar';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Modal } from '@/app/components/ui/Modal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Set up default layout array
const DEFAULT_LAYOUT = ['kpi_cards', 'my_work_todo', 'cash_flow_chart', 'dashboard_calendar'];

// Mock data for charts
const revenueData = [
    { name: 'T1', value: 1.8 },
    { name: 'T2', value: 2.1 },
    { name: 'T3', value: 2.3 },
    { name: 'T4', value: 2.0 },
    { name: 'T5', value: 2.5 },
    { name: 'T6', value: 2.8 },
    { name: 'T7', value: 2.6 },
    { name: 'T8', value: 3.0 },
    { name: 'T9', value: 2.9 },
    { name: 'T10', value: 3.2 },
    { name: 'T11', value: 2.7 },
    { name: 'T12', value: 2.5 },
];

const salesDistribution = [
    { name: 'Điện tử', value: 40 },
    { name: 'Văn phòng phẩm', value: 20 },
    { name: 'Thực phẩm', value: 15 },
    { name: 'Khác', value: 25 },
];
const COLORS = ['#667eea', '#43e97b', '#fa709a', '#4facfe'];

interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
}

import { getTodos, addTodo, toggleTodo, deleteTodo } from '@/app/actions/todo';

function TodoListWidget() {
    const [todos, setTodos] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);

    // Fetch todos from database
    useEffect(() => {
        const fetchTodos = async () => {
            try {
                const res = await getTodos();
                if (res.status === 'success') {
                    setTodos(res.todos);
                }
            } catch (error) {
                console.error("Failed to fetch todos", error);
            } finally {
                setIsLoaded(true);
            }
        };

        fetchTodos();
    }, []);

    const handleAddTodo = async (e?: React.FormEvent | React.KeyboardEvent) => {
        if (e) e.preventDefault();
        if (!inputValue.trim() || isSubmitting) return;

        setIsSubmitting(true);
        // Optimistic update
        const tempId = 'temp-' + Date.now();
        const newTempTodo = {
            id: tempId,
            text: inputValue.trim(),
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        setTodos(prev => [newTempTodo, ...prev]);
        setInputValue('');

        try {
            const res = await addTodo(newTempTodo.text);
            if (res.status === 'success' && res.todo) {
                // Replace temp ID with real DB ID
                setTodos(prev => prev.map(t => t.id === tempId ? res.todo : t));
                setIsAddTodoModalOpen(false);
            } else {
                // Revert on failure
                setTodos(prev => prev.filter(t => t.id !== tempId));
            }
        } catch (error) {
            console.error("Failed to add todo", error);
            setTodos(prev => prev.filter(t => t.id !== tempId));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleTodo = async (id: string, currentStatus: boolean) => {
        // Optimistic toggle
        const backupTodos = [...todos];
        setTodos(prev => prev.map(todo =>
            todo.id === id ? { ...todo, completed: !currentStatus } : todo
        ));

        try {
            const res = await toggleTodo(id, currentStatus);
            if (res.status === 'error') {
                // Revert
                setTodos(backupTodos);
            }
        } catch (error) {
            console.error("Failed to mark todo as completed", error);
            setTodos(backupTodos);
        }
    };

    const handleRemoveTodo = async (id: string) => {
        // Manual remove
        const backupTodos = [...todos];
        setTodos(prev => prev.filter(todo => todo.id !== id));

        try {
            const res = await deleteTodo(id);
            if (res.status === 'error') {
                setTodos(backupTodos);
            }
        } catch (error) {
            console.error("Failed to remove todo", error);
            setTodos(backupTodos);
        }
    };

    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);

    // Lọc và hiển thị
    // Khi thu gọn: hiển thị tối đa 5 công việc chưa hoàn thành
    // Khi mở rộng: hiển thị tất cả (chưa hoàn thành trước, hoàn thành sau)
    const displayedTodos = showAll
        ? [...activeTodos, ...completedTodos]
        : activeTodos.slice(0, 5);

    if (!isLoaded) return (
        <div className="flex items-center justify-center p-8 h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    ); // Avoid hydration mismatch and show loading state

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    Công việc cần làm
                </h3>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <button
                    onClick={() => setIsAddTodoModalOpen(true)}
                    className="flex-1 text-white font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
                    style={{ backgroundColor: '#2563eb' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                >
                    <Plus size={18} />
                    <span>Tạo Việc Cần Làm</span>
                </button>
                <button
                    onClick={() => setShowAll(!showAll)}
                    disabled={todos.length === 0}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span>{showAll ? 'Thu gọn danh sách' : `Xem toàn bộ (${todos.length})`}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: showAll ? '400px' : 'auto' }}>
                {todos.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 mt-8">
                        Chưa có công việc nào.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {displayedTodos.map(todo => (
                            <li
                                key={todo.id}
                                className={`flex items-start gap-2.5 p-3 rounded-lg group transition-all ${todo.completed ? 'bg-gray-50/50 opacity-75 border border-transparent' : 'bg-white shadow-sm border border-gray-100 hover:border-blue-200'}`}
                            >
                                <button
                                    onClick={() => handleToggleTodo(todo.id, todo.completed)}
                                    className="mt-0.5 text-gray-400 hover:text-emerald-500 flex-shrink-0 transition-colors"
                                    title={todo.completed ? "Đánh dấu chưa hoàn thành" : "Hoàn thành công việc"}
                                >
                                    {todo.completed ? (
                                        <CheckCircle2 size={20} className="text-emerald-500" />
                                    ) : (
                                        <Circle size={20} className="hover:text-emerald-500 transition-colors" />
                                    )}
                                </button>
                                <div className="flex-1 flex flex-col min-w-0 pt-0.5">
                                    <span className={`text-[15px] font-medium leading-relaxed whitespace-pre-wrap break-words ${todo.completed ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-800'}`}>
                                        {todo.text}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-400">
                                        <span className="flex items-center gap-1 leading-none" title="Ngày tạo">
                                            <Clock size={11} className={todo.completed ? "text-gray-300" : "text-blue-400/70"} />
                                            {new Date(todo.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveTodo(todo.id)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                                    title="Xóa công việc"
                                >
                                    <X size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Modal isOpen={isAddTodoModalOpen} onClose={() => setIsAddTodoModalOpen(false)} title="Tạo Việc Cần Làm" maxWidth="500px">
                <form onSubmit={handleAddTodo} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nội dung công việc <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddTodo();
                                }
                            }}
                            placeholder="Nhập nội dung các việc cần làm...&#10;(Hỗ trợ nhập nhiều dòng)"
                            className="w-full border border-gray-300 rounded-lg p-3 outline-none transition-shadow resize-y min-h-[120px]"
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.2)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = 'none'; }}
                            autoFocus
                        />
                        <p className="mt-1.5 text-xs text-gray-500">
                            Nhấn <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-[10px] font-sans">Enter</kbd> để tạo nhanh, <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-[10px] font-sans">Shift + Enter</kbd> để xuống dòng.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsAddTodoModalOpen(false)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            disabled={isSubmitting}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            disabled={!inputValue.trim() || isSubmitting}
                            style={{ backgroundColor: '#2563eb' }}
                            onMouseEnter={(e) => {
                                if (!(!inputValue.trim() || isSubmitting)) {
                                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!(!inputValue.trim() || isSubmitting)) {
                                    e.currentTarget.style.backgroundColor = '#2563eb';
                                }
                            }}
                        >
                            {isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Tạo mới'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

import { useRouter } from 'next/navigation';
import { AddEventModal } from './AddEventModal';

export function DashboardClient({ kpiData, userTasks = [], quotes = [], invoices = [], savedConfig = "[]" }: { kpiData?: any, userTasks?: any[], quotes?: any[], invoices?: any[], savedConfig?: string }) {
    const router = useRouter();
    const [tasks, setTasks] = useState<any[]>(userTasks);

    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
    const [selectedCalendarTasks, setSelectedCalendarTasks] = useState<any[]>([]);
    const [selectedCalendarQuotes, setSelectedCalendarQuotes] = useState<any[]>([]);
    const [selectedCalendarInvoices, setSelectedCalendarInvoices] = useState<any[]>([]);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [isCustomizeMode, setIsCustomizeMode] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Initialize layout from savedConfig or default
    const [layout, setLayout] = useState<string[]>(() => {
        try {
            const parsed = JSON.parse(savedConfig);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Migrate legacy 'charts_calendar' combined string
                const migrated = [];
                for (const item of parsed) {
                    if (item === 'charts_calendar') {
                        migrated.push('cash_flow_chart', 'dashboard_calendar');
                    } else {
                        migrated.push(item);
                    }
                }
                return migrated;
            }
        } catch (e) {
            console.error("Failed to parse saved config", e);
        }
        return DEFAULT_LAYOUT;
    });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const newLayout = Array.from(layout);
        const [reorderedItem] = newLayout.splice(result.source.index, 1);
        newLayout.splice(result.destination.index, 0, reorderedItem);

        setLayout(newLayout);

        try {
            const { saveDashboardConfig } = await import('@/app/dashboard/actions');
            const { getSession } = await import('next-auth/react');
            const session = await getSession();

            if (session?.user?.id) {
                await saveDashboardConfig(session.user.id, JSON.stringify(newLayout));
            }
        } catch (error) {
            console.error("Failed to save new layout to DB", error);
        }
    };

    useEffect(() => {
        setTasks(userTasks || []);
    }, [userTasks]);

    const handleDateClick = (date: Date, dayTasks: any[], dayQuotes: any[] = [], dayInvoices: any[] = []) => {
        setSelectedCalendarDate(date);
        setSelectedCalendarTasks(dayTasks);
        setSelectedCalendarQuotes(dayQuotes);
        setSelectedCalendarInvoices(dayInvoices);
    };

    // Revenue calculations
    const revenueThisMonth = kpiData?.revenueThisMonth || 0;
    const revenueLastMonth = kpiData?.revenueLastMonth || 0;

    let revenueGrowth = 0;
    if (revenueLastMonth > 0) {
        revenueGrowth = ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
    } else if (revenueThisMonth > 0) {
        // Mới có doanh thu tháng này
        revenueGrowth = 100;
    }

    const isRevenueUp = revenueGrowth >= 0;

    // Output calculations
    const invoicesThisMonth = kpiData?.invoicesThisMonth || 0;
    const invoicesLastMonth = kpiData?.invoicesLastMonth || 0;

    let invoiceGrowth = 0;
    if (invoicesLastMonth > 0) {
        invoiceGrowth = ((invoicesThisMonth - invoicesLastMonth) / invoicesLastMonth) * 100;
    } else if (invoicesThisMonth > 0) {
        invoiceGrowth = 100;
    }
    const isInvoiceUp = invoiceGrowth >= 0;

    // Payment calculations
    const paymentsThisMonth = kpiData?.paymentsThisMonth || 0;
    const paymentsLastMonth = kpiData?.paymentsLastMonth || 0;

    let paymentGrowth = 0;
    if (paymentsLastMonth > 0) {
        paymentGrowth = ((paymentsThisMonth - paymentsLastMonth) / paymentsLastMonth) * 100;
    } else if (paymentsThisMonth > 0) {
        paymentGrowth = 100;
    }
    const isPaymentUp = paymentGrowth >= 0;

    // Debt calculations
    const debtThisMonth = kpiData?.debtThisMonth || 0;
    const debtLastMonth = kpiData?.debtLastMonth || 0;

    let debtGrowth = 0;
    if (debtLastMonth > 0) {
        debtGrowth = ((debtThisMonth - debtLastMonth) / debtLastMonth) * 100;
    } else if (debtThisMonth > 0) {
        debtGrowth = 100;
    }
    const isDebtUp = debtGrowth >= 0;

    return (
        <div className="bg-gray-50/50 min-h-screen p-4 xl:p-8 pt-4 xl:pt-6">
            <div className="max-w-[1400px] mx-auto space-y-8 pb-10">
                <div className="flex items-center justify-between mb-2 -mx-2">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Bảng Điều Khiển</h2>
                        <p className="text-gray-600 mt-1">Tổng quan hoạt động doanh nghiệp</p>
                    </div>
                    <button
                        onClick={() => setIsCustomizeMode(!isCustomizeMode)}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors border ${isCustomizeMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                        {isCustomizeMode ? 'Hoàn tất Tùy chỉnh ✓' : 'Tùy chỉnh Giao diện ⚙️'}
                    </button>
                </div>

                {isMounted ? (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="dashboard-widgets">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-6 -m-2">
                                    {layout.map((widgetId, index) => {
                                        return (
                                            <Draggable key={widgetId} draggableId={widgetId} index={index} isDragDisabled={!isCustomizeMode}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...(isCustomizeMode ? provided.dragHandleProps : {})}
                                                        className={`transition-shadow ${snapshot.isDragging ? 'opacity-70 z-50 rounded-xl' : ''} ${isCustomizeMode ? 'ring-2 ring-dashed ring-blue-200 bg-blue-50/20 p-2 rounded-xl relative cursor-grab active:cursor-grabbing' : ''}`}
                                                    >
                                                        {isCustomizeMode && (
                                                            <div className="absolute top-4 right-4 bg-white border border-gray-200 shadow-sm p-1.5 rounded-lg text-gray-400 z-10 pointer-events-none">
                                                                <div className="w-5 h-5 flex flex-col items-center justify-center gap-1 opacity-80">
                                                                    <div className="w-4 h-0.5 bg-current rounded-full"></div>
                                                                    <div className="w-4 h-0.5 bg-current rounded-full"></div>
                                                                    <div className="w-4 h-0.5 bg-current rounded-full"></div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {widgetId === 'kpi_cards' && (
                                                            /* KPI Cards */
                                                            <div className="gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                                                                <div className="stat-card stat-card-purple flex-1 min-w-[200px]">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <span className="stat-title text-sm font-semibold uppercase tracking-wide">Doanh Thu Tháng</span>
                                                                        <div className="stat-icon p-2 rounded-xl flex items-center justify-center">
                                                                            <DollarSign size={20} strokeWidth={2.5} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="stat-info">
                                                                        <span className="stat-value text-3xl font-bold mb-1 truncate" title={formatMoney(revenueThisMonth)}>{formatMoney(revenueThisMonth)}</span>
                                                                        <div className="text-[12px] font-medium mt-1" style={{ color: isRevenueUp ? '#10b981' : '#ef4444' }}>
                                                                            <span className="font-bold">{isRevenueUp ? '↑' : '↓'} {Math.abs(revenueGrowth).toFixed(1)}%</span>
                                                                            <span className="text-purple-700 opacity-80" style={{ color: 'inherit' }}> so với tháng trước</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card stat-card-amber flex-1 min-w-[200px]">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <span className="stat-title text-sm font-semibold uppercase tracking-wide">Hóa Đơn Phát Hành</span>
                                                                        <div className="stat-icon p-2 rounded-xl flex items-center justify-center">
                                                                            <Receipt size={20} strokeWidth={2.5} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="stat-info">
                                                                        <span className="stat-value text-3xl font-bold mb-1">{invoicesThisMonth}</span>
                                                                        <div className="text-[12px] font-medium mt-1" style={{ color: isInvoiceUp ? '#10b981' : '#ef4444' }}>
                                                                            <span className="font-bold">{isInvoiceUp ? '↑' : '↓'} {Math.abs(invoiceGrowth).toFixed(1)}%</span>
                                                                            <span className="text-amber-700 opacity-80" style={{ color: 'inherit' }}> so với tháng trước</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card stat-card-blue flex-1 min-w-[200px]">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <span className="stat-title text-sm font-semibold uppercase tracking-wide">Tiền Đã Thu</span>
                                                                        <div className="stat-icon p-2 rounded-xl flex items-center justify-center">
                                                                            <CreditCard size={20} strokeWidth={2.5} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="stat-info">
                                                                        <span className="stat-value text-3xl font-bold mb-1 truncate" title={formatMoney(paymentsThisMonth)}>{formatMoney(paymentsThisMonth)}</span>
                                                                        <div className="text-[12px] font-medium mt-1" style={{ color: isPaymentUp ? '#10b981' : '#ef4444' }}>
                                                                            <span className="font-bold">{isPaymentUp ? '↑' : '↓'} {Math.abs(paymentGrowth).toFixed(1)}%</span>
                                                                            <span className="text-blue-700 opacity-80" style={{ color: 'inherit' }}> so với tháng trước</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="stat-card stat-card-green flex-1 min-w-[200px]">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <span className="stat-title text-sm font-semibold uppercase tracking-wide" style={{ color: '#059669' }}>Công Nợ Phải Thu</span>
                                                                        <div className="stat-icon p-2 rounded-xl flex items-center justify-center">
                                                                            <Briefcase size={20} strokeWidth={2.5} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="stat-info">
                                                                        <span className="stat-value text-3xl font-bold mb-1 truncate" style={{ color: '#059669' }} title={formatMoney(debtThisMonth)}>{formatMoney(debtThisMonth)}</span>
                                                                        <div className="text-[12px] font-medium mt-1" style={{ color: isDebtUp ? '#ef4444' : '#10b981' }}>
                                                                            <span className="font-bold">{isDebtUp ? '↑' : '↓'} {Math.abs(debtGrowth).toFixed(1)}%</span>
                                                                            <span className="text-green-700 opacity-80" style={{ color: 'inherit' }}> so với tháng trước</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {widgetId === 'my_work_todo' && (
                                                            /* My Work & Todo Row */
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                                                                {/* Vùng 1: Công việc của tôi */}
                                                                <div style={{ flex: '3 1 500px', minWidth: 0 }} className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                                                            <Briefcase size={20} className="text-blue-500" />
                                                                            Công việc của tôi
                                                                        </h3>
                                                                        <span className="text-sm font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">{tasks.length} việc</span>
                                                                    </div>

                                                                    {tasks.length === 0 ? (
                                                                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200 p-8">
                                                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                                                                <Briefcase size={24} className="text-gray-200" />
                                                                            </div>
                                                                            <p className="font-medium text-gray-500">Chưa có công việc nào</p>
                                                                            <p className="text-sm mt-1 text-center max-w-sm">
                                                                                Các công việc bạn được giao phụ trách hoặc theo dõi sẽ hiển thị tại đây.
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="table-wrapper custom-scrollbar" style={{ flex: 1, maxHeight: '320px', overflowY: 'auto' }}>
                                                                            <table style={{ minWidth: '100%' }}>
                                                                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                                                                    <tr>
                                                                                        <th>Tên công việc</th>
                                                                                        <th>Mức độ</th>
                                                                                        <th>Hạn chót</th>
                                                                                        <th>Liên quan</th>
                                                                                        <th>Tình trạng</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {tasks.map((task: any) => {
                                                                                        const relatedEntityName = task.customer?.name || task.contract?.code || task.salesInvoice?.code || task.salesOrder?.code || '';
                                                                                        const isDueSoon = task.dueDate && new Date(task.dueDate).getTime() - new Date().getTime() < 86400000 && task.status !== 'DONE';

                                                                                        return (
                                                                                            <tr key={task.id}>
                                                                                                <td>
                                                                                                    <div style={{ fontWeight: 500, color: isDueSoon ? 'var(--danger)' : 'var(--text-main)', display: 'flex', alignItems: 'center' }}>
                                                                                                        <a href={`/tasks/${task.id}`} className="text-blue-600 hover:underline">
                                                                                                            {task.title}
                                                                                                        </a>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td>
                                                                                                    <span style={{
                                                                                                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                                                                        backgroundColor: task.priority === 'URGENT' ? 'var(--danger)' : (task.priority === 'HIGH' ? 'var(--warning)' : '#e2e8f0'),
                                                                                                        color: task.priority === 'URGENT' || task.priority === 'HIGH' ? '#fff' : '#000'
                                                                                                    }}>
                                                                                                        {task.priority === 'MEDIUM' ? 'TRUNG BÌNH' : task.priority === 'HIGH' ? 'CAO' : task.priority === 'URGENT' ? 'GẤP' : 'THẤP'}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td style={{ color: isDueSoon ? 'var(--danger)' : 'inherit' }}>
                                                                                                    {task.dueDate ? formatDate(new Date(task.dueDate)) : '-'}
                                                                                                </td>
                                                                                                <td>
                                                                                                    {relatedEntityName ? (
                                                                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{relatedEntityName}</span>
                                                                                                    ) : (
                                                                                                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                                                                    )}
                                                                                                </td>
                                                                                                <td>
                                                                                                    <select
                                                                                                        value={task.status}
                                                                                                        onChange={async (e) => {
                                                                                                            const newStatus = e.target.value;
                                                                                                            const previousStatus = task.status;

                                                                                                            // Optimistic update
                                                                                                            setTasks((prev: any[]) => prev.map((t: any) =>
                                                                                                                t.id === task.id ? { ...t, status: newStatus } : t
                                                                                                            ));

                                                                                                            try {
                                                                                                                const { updateDashboardTaskStatus } = await import('@/app/dashboard/actions');
                                                                                                                const res = await updateDashboardTaskStatus(task.id, newStatus);
                                                                                                                if (!res || !res.success) {
                                                                                                                    // Revert if error
                                                                                                                    setTasks((prev: any[]) => prev.map((t: any) =>
                                                                                                                        t.id === task.id ? { ...t, status: previousStatus } : t
                                                                                                                    ));
                                                                                                                } else {
                                                                                                                    router.refresh();
                                                                                                                }
                                                                                                            } catch (error) {
                                                                                                                console.error("Failed to update status", error);
                                                                                                                setTasks((prev: any[]) => prev.map((t: any) =>
                                                                                                                    t.id === task.id ? { ...t, status: previousStatus } : t
                                                                                                                ));
                                                                                                            }
                                                                                                        }}
                                                                                                        style={{
                                                                                                            padding: '4px 8px', borderRadius: 'var(--radius)',
                                                                                                            border: '1px solid var(--border)', fontSize: '0.85rem',
                                                                                                            backgroundColor: 'transparent', cursor: 'pointer'
                                                                                                        }}
                                                                                                    >
                                                                                                        <option value="TODO">Cần Làm</option>
                                                                                                        <option value="IN_PROGRESS">Đang Xử Lý</option>
                                                                                                        <option value="REVIEW">Chờ Duyệt</option>
                                                                                                        <option value="DONE">Hoàn Thành</option>
                                                                                                    </select>
                                                                                                </td>
                                                                                            </tr>
                                                                                        )
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Vùng 2: Công việc cần làm */}
                                                                <div style={{ flex: '1 1 300px', minWidth: 0 }} className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
                                                                    <TodoListWidget />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {widgetId === 'cash_flow_chart' && (
                                                            /* Cash Flow Chart */
                                                            <div className="w-full">
                                                                <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
                                                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Lưu Chuyển Tiền Tệ Năm {new Date().getFullYear()}</h3>
                                                                    <div style={{ height: '350px', width: '100%', marginLeft: '-15px' }}>
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                            <AreaChart data={kpiData?.cashFlow || []} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                                                                                <defs>
                                                                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                                                                    </linearGradient>
                                                                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                                                                                    </linearGradient>
                                                                                    <linearGradient id="colorSupplier" x1="0" y1="0" x2="0" y2="1">
                                                                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                                                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                                                                                    </linearGradient>
                                                                                </defs>
                                                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 13 }} dy={10} />
                                                                                <YAxis
                                                                                    axisLine={false}
                                                                                    tickLine={false}
                                                                                    tick={{ fill: '#9ca3af', fontSize: 13 }}
                                                                                    dx={-10}
                                                                                    tickFormatter={(value) => {
                                                                                        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}T`;
                                                                                        if (value >= 1000000) return `${(value / 1000000).toFixed(0)}Tr`;
                                                                                        return value;
                                                                                    }}
                                                                                />
                                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                                                <Tooltip
                                                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                                                    formatter={(value: any, name: any) => {
                                                                                        let label = '';
                                                                                        if (name === 'income') label = 'Tổng Thu';
                                                                                        if (name === 'expense') label = 'Tổng Chi';
                                                                                        if (name === 'supplierPayment') label = 'Trả NCC';
                                                                                        return [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0), label];
                                                                                    }}
                                                                                />
                                                                                <Legend
                                                                                    verticalAlign="top"
                                                                                    height={36}
                                                                                    formatter={(value) => {
                                                                                        if (value === 'income') return 'Tổng Thu';
                                                                                        if (value === 'expense') return 'Lương / Chi Phí';
                                                                                        if (value === 'supplierPayment') return 'Thanh Toán NCC';
                                                                                        return value;
                                                                                    }}
                                                                                />
                                                                                <Area type="monotone" dataKey="income" name="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                                                                <Area type="monotone" dataKey="expense" name="expense" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                                                                                <Area type="monotone" dataKey="supplierPayment" name="supplierPayment" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSupplier)" />
                                                                            </AreaChart>
                                                                        </ResponsiveContainer>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {widgetId === 'dashboard_calendar' && (
                                                            /* Dashboard Calendar */
                                                            <div className="w-full">
                                                                <div className="border border-gray-100 rounded-xl shadow-sm bg-white overflow-hidden flex flex-col">
                                                                    <DashboardCalendar
                                                                        tasks={tasks}
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
                    <div className="flex flex-col gap-6 -m-2 animate-pulse mt-4">
                        <div className="h-32 bg-gray-200 rounded-xl"></div>
                        <div className="h-96 bg-gray-200 rounded-xl"></div>
                        <div className="h-96 bg-gray-200 rounded-xl"></div>
                    </div>
                )}
            </div>

            {/* Calendar Tasks Modal */}
            {
                selectedCalendarDate && (
                    <div className="modal-backdrop" style={{ zIndex: 99999 }}>
                        <div className="w-full mx-auto bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ maxWidth: '650px', maxHeight: '90vh' }}>
                            <div className="px-6 py-5 flex justify-between items-start bg-white relative z-10 shrink-0" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2.5" style={{ color: '#0f172a' }}>
                                        <div className="p-2 rounded-xl" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                                            <CalendarIcon className="w-5 h-5 stroke-[2.5px]" />
                                        </div>
                                        Lịch trình ngày {format(selectedCalendarDate, 'dd/MM/yyyy')}
                                    </h3>
                                    <p className="text-sm font-medium mt-1.5 ml-[46px]" style={{ color: '#64748b' }}>
                                        {selectedCalendarTasks.length + selectedCalendarQuotes.length + selectedCalendarInvoices.length} sự kiện/công việc trong ngày
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedCalendarDate(null)}
                                    className="p-2 rounded-full transition-colors flex items-center justify-center -mr-2 -mt-1"
                                    style={{ color: '#94a3b8', background: 'transparent' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-0 custom-scrollbar" style={{ backgroundColor: '#f8fafc' }}>
                                {(selectedCalendarTasks.length === 0 && selectedCalendarQuotes.length === 0 && selectedCalendarInvoices.length === 0) ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <CalendarIcon className="w-10 h-10 text-gray-300" />
                                        </div>
                                        <p className="text-gray-500 font-medium text-lg">Không có lịch trình nào</p>
                                        <p className="text-gray-400 mt-1">Hôm nay là một ngày rảnh rỗi tuyệt vời.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {/* Invoices */}
                                        {selectedCalendarInvoices.map(invoice => (
                                            <div key={`inv-${invoice.id}`} className="rounded-xl p-4 transition-all cursor-pointer flex flex-col gap-3" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f97316', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }} onClick={() => router.push(`/sales/invoices/${invoice.id}`)} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-[15px] line-clamp-1" style={{ color: '#0f172a' }}>Hóa đơn: {invoice.code}</h4>
                                                        {invoice.customer && (
                                                            <div className="flex items-center gap-1.5 mt-1.5 text-sm" style={{ color: '#64748b' }}>
                                                                <Users className="w-4 h-4" />
                                                                <span className="truncate flex-1">{invoice.customer.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px dashed #e2e8f0' }}>
                                                    <div className="font-bold text-[15px]" style={{ color: '#ea580c' }}>
                                                        {formatMoney(invoice.totalAmount)}
                                                    </div>
                                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full tracking-wide" style={{
                                                        backgroundColor: invoice.status === 'DRAFT' ? '#f1f5f9' : invoice.status === 'ISSUED' ? '#eff6ff' : invoice.status === 'PARTIAL_PAID' ? '#fff7ed' : invoice.status === 'PAID' ? '#ecfdf5' : 'transparent',
                                                        color: invoice.status === 'DRAFT' ? '#475569' : invoice.status === 'ISSUED' ? '#2563eb' : invoice.status === 'PARTIAL_PAID' ? '#ea580c' : invoice.status === 'PAID' ? '#16a34a' : 'inherit',
                                                        border: `1px solid ${invoice.status === 'DRAFT' ? '#e2e8f0' : invoice.status === 'ISSUED' ? '#bfdbfe' : invoice.status === 'PARTIAL_PAID' ? '#fed7aa' : invoice.status === 'PAID' ? '#a7f3d0' : 'transparent'}`
                                                    }}>
                                                        {invoice.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Quotes */}
                                        {selectedCalendarQuotes.map(quote => (
                                            <div key={`quo-${quote.id}`} className="rounded-xl p-4 transition-all cursor-pointer flex flex-col gap-3" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #22c55e', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }} onClick={() => router.push(`/sales/estimates/${quote.id}`)} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-[15px] line-clamp-2" style={{ color: '#0f172a' }}>Báo giá: {quote.code}</h4>
                                                        {quote.customer && (
                                                            <div className="flex items-center gap-1.5 mt-1.5 text-sm" style={{ color: '#64748b' }}>
                                                                <Users className="w-4 h-4" />
                                                                <span className="truncate flex-1">{quote.customer.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px dashed #e2e8f0' }}>
                                                    <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#64748b' }}>
                                                        <Clock className="w-4 h-4" />
                                                        <span>{format(new Date(quote.createdAt), 'HH:mm', { locale: vi })}</span>
                                                    </div>
                                                    <span className="text-[11px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wide" style={{
                                                        backgroundColor: quote.status === 'DRAFT' ? '#f8fafc' : quote.status === 'SENT' ? '#eff6ff' : quote.status === 'ACCEPTED' ? '#ecfdf5' : quote.status === 'REJECTED' ? '#fef2f2' : 'transparent',
                                                        color: quote.status === 'DRAFT' ? '#64748b' : quote.status === 'SENT' ? '#2563eb' : quote.status === 'ACCEPTED' ? '#16a34a' : quote.status === 'REJECTED' ? '#dc2626' : 'inherit',
                                                        border: `1px solid ${quote.status === 'DRAFT' ? '#e2e8f0' : quote.status === 'SENT' ? '#bfdbfe' : quote.status === 'ACCEPTED' ? '#bbf7d0' : quote.status === 'REJECTED' ? '#fecaca' : 'transparent'}`
                                                    }}>
                                                        {quote.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Tasks */}
                                        {selectedCalendarTasks.map(task => (
                                            <div key={`task-${task.id}`} className="rounded-xl p-4 transition-all cursor-pointer flex flex-col gap-3" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }} onClick={() => router.push(`/tasks/${task.id}`)} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-[15px] line-clamp-2 leading-tight" style={{ color: '#0f172a', wordBreak: 'break-word' }}>{task.title}</h4>
                                                        {task.customer && (
                                                            <div className="flex items-center gap-1.5 mt-2 text-sm" style={{ color: '#64748b' }}>
                                                                <Users className="w-4 h-4" />
                                                                <span className="truncate flex-1">{task.customer.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide" style={{
                                                            backgroundColor: task.priority === 'URGENT' ? '#fef2f2' : task.priority === 'HIGH' ? '#fff7ed' : task.priority === 'MEDIUM' ? '#eff6ff' : '#f8fafc',
                                                            color: task.priority === 'URGENT' ? '#dc2626' : task.priority === 'HIGH' ? '#ea580c' : task.priority === 'MEDIUM' ? '#2563eb' : '#475569'
                                                        }}>
                                                            {task.priority === 'URGENT' ? 'KHẨN CẤP' : task.priority === 'HIGH' ? 'CAO' : task.priority === 'MEDIUM' ? 'TRUNG BÌNH' : 'THẤP'}
                                                        </span>
                                                        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold tracking-wide" style={{
                                                            backgroundColor: task.isPublic ? '#f8fafc' : '#fef2f2',
                                                            color: task.isPublic ? '#64748b' : '#dc2626',
                                                            border: `1px solid ${task.isPublic ? '#e2e8f0' : '#fecaca'}`
                                                        }}>
                                                            {task.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3 stroke-[2.5px]" />}
                                                            {task.isPublic ? 'CÔNG KHAI' : 'CÁ NHÂN'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px dashed #e2e8f0' }}>
                                                    <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#64748b' }}>
                                                        <Clock className="w-4 h-4" />
                                                        <span>{format(new Date(task.dueDate), 'HH:mm', { locale: vi })}</span>
                                                    </div>
                                                    <span className="text-[11px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wide" style={{
                                                        backgroundColor: task.status === 'TODO' ? '#f8fafc' : task.status === 'IN_PROGRESS' ? '#eff6ff' : task.status === 'REVIEW' ? '#faf5ff' : task.status === 'DONE' ? '#ecfdf5' : 'transparent',
                                                        color: task.status === 'TODO' ? '#64748b' : task.status === 'IN_PROGRESS' ? '#2563eb' : task.status === 'REVIEW' ? '#9333ea' : task.status === 'DONE' ? '#16a34a' : 'inherit',
                                                        border: `1px solid ${task.status === 'TODO' ? '#e2e8f0' : task.status === 'IN_PROGRESS' ? '#bfdbfe' : task.status === 'REVIEW' ? '#e9d5ff' : task.status === 'DONE' ? '#bbf7d0' : 'transparent'}`
                                                    }}>
                                                        {task.status === 'TODO' ? 'Cần làm' : task.status === 'IN_PROGRESS' ? 'Đang xử lý' : task.status === 'REVIEW' ? 'Chờ duyệt' : 'Hoàn thành'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 sm:p-5 flex justify-end gap-3 shrink-0 relative z-10" style={{ backgroundColor: '#ffffff', boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <button
                                    onClick={() => setIsAddEventModalOpen(true)}
                                    className="font-semibold py-2.5 px-6 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                                    style={{ background: 'linear-gradient(to right, #6366f1, #9333ea)', color: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(99,102,241,0.2)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(99,102,241,0.3)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(99,102,241,0.2)'; }}
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>Thêm sự kiện</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <AddEventModal
                isOpen={isAddEventModalOpen}
                initialDate={selectedCalendarDate}
                onClose={() => setIsAddEventModalOpen(false)}
                onSuccess={() => {
                    // Refetch or just rely on router.refresh() inside AddEventModal
                }}
            />
        </div>
    );
}
