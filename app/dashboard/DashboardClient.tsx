'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Receipt, CreditCard, Users, Box, Briefcase, Plus, X, CheckCircle2, Circle, Clock, CheckCheck, Calendar as CalendarIcon } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { formatMoney } from '@/lib/utils/formatters';
import { DashboardCalendar } from './DashboardCalendar';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

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
        // Optimistic delete for completion
        const backupTodos = [...todos];
        setTodos(prev => prev.filter(todo => todo.id !== id));

        try {
            const res = await deleteTodo(id);
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
        // Same logic for manual remove
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

    // Lọc và hiển thị chỉ tối đa 5 items nếu không showAll
    const displayedTodos = showAll ? todos : todos.slice(0, 5);

    if (!isLoaded) return (
        <div className="flex items-center justify-center p-8 h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    ); // Avoid hydration mismatch and show loading state

    return (
        <div className="flex flex-col h-full opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards', animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    Công việc cần làm
                </h3>
                {todos.length > 5 && (
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-blue-600 text-sm hover:underline font-medium bg-blue-50 px-3 py-1 rounded-full transition-colors hover:bg-blue-100"
                    >
                        {showAll ? 'Thu gọn danh sách nhỏ lại' : `Xem toàn bộ ${todos.length} công việc`}
                    </button>
                )}
            </div>

            <form onSubmit={handleAddTodo} className="mb-4 flex gap-2 items-start">
                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddTodo();
                        }
                    }}
                    placeholder="Nhập nội dung vào đây...&#10;(Nhấn Enter để lưu, Shift + Enter để xuống dòng dài hơn)"
                    className="flex-1 text-[15px] p-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all min-h-[64px] max-h-[250px] resize-y shadow-inner bg-gray-50/30"
                    rows={2}
                />
                <button
                    type="submit"
                    title="Thêm công việc"
                    disabled={!inputValue.trim()}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-colors h-[64px] w-[54px] flex items-center justify-center shadow-sm"
                >
                    <Plus size={24} />
                </button>
            </form>

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
                                    title="Hoàn thành công việc"
                                >
                                    <Circle size={20} className="hover:text-emerald-500 transition-colors" />
                                </button>
                                <div className="flex-1 flex flex-col min-w-0 pt-0.5">
                                    <span className={`text-[15px] font-medium text-gray-800 leading-relaxed whitespace-pre-wrap break-words`}>
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
        </div>
    );
}

import { useRouter } from 'next/navigation';

export function DashboardClient({ kpiData, userTasks = [], quotes = [], invoices = [] }: { kpiData?: any, userTasks?: any[], quotes?: any[], invoices?: any[] }) {
    const router = useRouter();
    const [tasks, setTasks] = useState<any[]>(userTasks);

    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
    const [selectedCalendarTasks, setSelectedCalendarTasks] = useState<any[]>([]);
    const [selectedCalendarQuotes, setSelectedCalendarQuotes] = useState<any[]>([]);
    const [selectedCalendarInvoices, setSelectedCalendarInvoices] = useState<any[]>([]);

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
                <div className="flex flex-col gap-6 -m-2">
                    {/* Header Info */}
                    <div className="mb-2">
                        <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Bảng Điều Khiển</h2>
                        <p className="text-gray-600 mt-1">Tổng quan hoạt động doanh nghiệp</p>
                    </div>

                    {/* KPI Cards */}
                    <div
                        className="gap-4 mb-8"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
                        }}
                    >
                        {/* Doanh Thu */}
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

                        {/* Hóa Đơn Phát Hành */}
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

                        {/* Thực Thu */}
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

                        {/* Công Nợ Phải Thu */}
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
                </div>

                {/* My Work & Todo Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
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
                            <div className="flex-1 overflow-auto pr-2 -mr-2" style={{ maxHeight: '450px' }}>
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
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
                                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '-'}
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
                            </div>
                        )}
                    </div>

                    {/* Vùng 2: Công việc cần làm */}
                    <div style={{ flex: '1 1 300px', minWidth: 0 }} className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
                        <TodoListWidget />
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm xl:col-span-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Lưu Chuyển Tiền Tệ Năm {new Date().getFullYear()}</h3>
                        <div style={{ height: '350px', width: '100%', marginLeft: '-15px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kpiData?.cashFlow || []} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
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
                                    <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="expense" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="supplierPayment" name="supplierPayment" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="xl:col-span-1 border border-gray-100 rounded-xl shadow-sm bg-white overflow-hidden flex flex-col">
                        <DashboardCalendar
                            tasks={tasks}
                            quotes={quotes || []}
                            invoices={invoices || []}
                            onDateClick={handleDateClick}
                        />
                    </div>
                </div>

            </div>

            {/* Calendar Tasks Modal */}
            {selectedCalendarDate && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" style={{ zIndex: 9999 }}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden transform transition-all">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">
                                    Lịch trình {format(selectedCalendarDate, 'dd/MM/yyyy')}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {selectedCalendarTasks.length + selectedCalendarQuotes.length + selectedCalendarInvoices.length} mục
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedCalendarDate(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar">
                            {(selectedCalendarTasks.length === 0 && selectedCalendarQuotes.length === 0 && selectedCalendarInvoices.length === 0) ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <CalendarIcon className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 font-medium text-lg">Không có lịch trình nào</p>
                                    <p className="text-gray-400 mt-1">Hôm nay là một ngày rảnh rỗi tuyệt vời.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Invoices */}
                                    {selectedCalendarInvoices.map(invoice => (
                                        <div key={`inv-${invoice.id}`} className="border-l-4 border-l-orange-500 border-y border-r border-gray-100 rounded-lg p-3 hover:bg-orange-50/30 transition-colors shadow-sm cursor-pointer" onClick={() => router.push(`/sales/invoices/${invoice.id}`)}>
                                            <div className="flex items-start justify-between">
                                                <h4 className="font-medium text-gray-800 line-clamp-1 pr-2">Hóa đơn: {invoice.code}</h4>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 shadow-sm bg-orange-100 text-orange-700">TỚI HẠN</span>
                                            </div>
                                            {invoice.customer && (
                                                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600">
                                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="truncate">{invoice.customer.name}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                                                <div className="font-bold text-orange-600 text-sm">
                                                    {formatMoney(invoice.totalAmount)}
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border
                                                    ${invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : ''}
                                                    ${invoice.status === 'ISSUED' ? 'bg-blue-100 text-blue-700' : ''}
                                                    ${invoice.status === 'PARTIAL_PAID' ? 'bg-orange-100 text-orange-700' : ''}
                                                    ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' : ''}
                                                `}>
                                                    {invoice.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Quotes */}
                                    {selectedCalendarQuotes.map(quote => (
                                        <div key={`quo-${quote.id}`} className="border-l-4 border-l-green-500 border-y border-r border-gray-100 rounded-lg p-3 hover:bg-green-50/30 transition-colors shadow-sm cursor-pointer" onClick={() => router.push(`/sales/estimates/${quote.id}`)}>
                                            <div className="flex items-start justify-between">
                                                <h4 className="font-medium text-gray-800 line-clamp-2 pr-2">Báo giá: {quote.code}</h4>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 shadow-sm bg-green-100 text-green-700">TẠO MỚI</span>
                                            </div>
                                            {quote.customer && (
                                                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600">
                                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="truncate">{quote.customer.name}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                                                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{format(new Date(quote.createdAt), 'HH:mm', { locale: vi })}</span>
                                                </div>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm border
                                                    ${quote.status === 'DRAFT' ? 'bg-white border-gray-200 text-gray-600' : ''}
                                                    ${quote.status === 'SENT' ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}
                                                    ${quote.status === 'ACCEPTED' ? 'bg-green-50 border-green-200 text-green-600' : ''}
                                                    ${quote.status === 'REJECTED' ? 'bg-red-50 border-red-200 text-red-600' : ''}
                                                `}>
                                                    {quote.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Tasks */}
                                    {selectedCalendarTasks.map(task => (
                                        <div key={`task-${task.id}`} className="border border-gray-100 rounded-lg p-3 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors shadow-sm cursor-pointer" onClick={() => router.push(`/tasks/${task.id}`)}>
                                            <div className="flex items-start justify-between">
                                                <h4 className="font-medium text-gray-800 line-clamp-2 pr-2">{task.title}</h4>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 shadow-sm
                                                    ${task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                                                        task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                                            task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-700'}
                                                `}>
                                                    {task.priority === 'URGENT' ? 'KHẨN CẤP' : task.priority === 'HIGH' ? 'CAO' : task.priority === 'MEDIUM' ? 'TRUNG BÌNH' : 'THẤP'}
                                                </span>
                                            </div>
                                            {task.customer && (
                                                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600">
                                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="truncate">{task.customer.name}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                                                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{format(new Date(task.dueDate), 'HH:mm', { locale: vi })}</span>
                                                </div>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm border
                                                    ${task.status === 'TODO' ? 'bg-white border-gray-200 text-gray-600' : ''}
                                                    ${task.status === 'IN_PROGRESS' ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}
                                                    ${task.status === 'REVIEW' ? 'bg-purple-50 border-purple-200 text-purple-600' : ''}
                                                    ${task.status === 'DONE' ? 'bg-green-50 border-green-200 text-green-600' : ''}
                                                `}>
                                                    {task.status === 'TODO' ? 'Cần làm' : task.status === 'IN_PROGRESS' ? 'Đang xử lý' : task.status === 'REVIEW' ? 'Chờ duyệt' : 'Hoàn thành'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-white">
                            <button
                                onClick={() => router.push(`/tasks/new?date=${format(selectedCalendarDate, 'yyyy-MM-dd')}`)}
                                className="w-full md:w-auto md:min-w-[200px] ml-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Thêm kế hoạch / Ghi chú</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
