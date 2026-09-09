'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { DollarSign, Receipt, CreditCard, Users, Box, Briefcase, Plus, X, CheckCircle2, Circle, Clock, CheckCheck, Calendar as CalendarIcon, Globe, Lock, ArrowRight, Building2, HandCoins } from 'lucide-react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { DashboardCalendar } from './DashboardCalendar';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Modal } from '@/app/components/ui/Modal';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { Skeleton } from '@/app/components/ui/Skeleton';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTranslation } from '@/app/i18n/LanguageContext';

// Set up default layout array
const DEFAULT_LAYOUT = ['kpi_cards', 'my_work_todo', 'my_leads_status', 'cash_flow_chart', 'dashboard_calendar'];

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

import { getTodos, addTodo, toggleTodo, deleteTodo, updateTodoText } from '@/app/actions/todo';

function TodoListWidget() {
    const { t } = useTranslation();
    const [todos, setTodos] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
    const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

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

    const handleUpdateTodo = async (id: string) => {
        if (!editValue.trim()) {
            setEditingTodoId(null);
            return;
        }
        
        const backupTodos = [...todos];
        setTodos(prev => prev.map(todo => 
            todo.id === id ? { ...todo, text: editValue.trim() } : todo
        ));
        setEditingTodoId(null);
        
        try {
            const res = await updateTodoText(id, editValue.trim());
            if (res.status === 'error') {
                setTodos(backupTodos);
            }
        } catch (error) {
            console.error("Failed to update todo", error);
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
        <div className="p-4 h-full flex flex-col">
            <Skeleton className="w-1/3 h-6 mb-4" />
            <Skeleton className="w-full h-10 mb-4" />
            <Skeleton className="w-full h-16 mb-2" />
            <Skeleton className="w-full h-16" />
        </div>
    ); // Avoid hydration mismatch and show loading state

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    {t("dashboard.todo.title")}
                </h3>
            </div>

            <div className="flex items-center gap-2 mb-3">
                <button
                    onClick={() => setIsAddTodoModalOpen(true)}
                    className="flex-1 text-white font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs bg-emerald-600 hover:bg-emerald-700"
                >
                    <Plus size={15} />
                    <span>{t("dashboard.todo.create")}</span>
                </button>
                <button
                    onClick={() => setShowAll(!showAll)}
                    disabled={todos.length === 0}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                    <span>{showAll ? t("dashboard.todo.collapse") : `${t("dashboard.todo.viewAll")} (${todos.length})`}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: showAll ? '350px' : 'auto' }}>
                {todos.length === 0 ? (
                    <EmptyState 
                        icon={CheckCircle2}
                        title={t("dashboard.todo.empty")}
                        description="Bắt đầu ngày mới bằng cách ghi chú công việc cần làm."
                    />
                ) : (
                    <ul className="space-y-1.5">
                        {displayedTodos.map(todo => (
                            <li
                                key={todo.id}
                                className={`flex items-start gap-2 p-2.5 rounded-lg group transition-all ${todo.completed ? 'bg-slate-50/60 opacity-75 border border-transparent' : 'bg-white shadow-xs border border-slate-200/80 hover:border-emerald-300'}`}
                            >
                                {editingTodoId === todo.id ? (
                                    <div className="flex-1 w-full">
                                        <textarea
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleUpdateTodo(todo.id);
                                                }
                                                if (e.key === 'Escape') {
                                                    setEditingTodoId(null);
                                                }
                                            }}
                                            className="w-full border border-green-300 rounded-md p-2 text-sm outline-none resize-y min-h-[60px]"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button onClick={() => setEditingTodoId(null)} className="text-xs text-gray-500 hover:text-gray-700">{t("common.cancel")}</button>
                                            <button onClick={() => handleUpdateTodo(todo.id)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">{t("common.save")}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleToggleTodo(todo.id, todo.completed)}
                                            className="mt-0.5 text-gray-400 hover:text-green-600 flex-shrink-0 transition-colors"
                                            title={todo.completed ? t("dashboard.todo.markIncomplete") : t("dashboard.todo.markComplete")}
                                        >
                                            {todo.completed ? (
                                                <CheckCircle2 size={20} className="text-green-600" />
                                            ) : (
                                                <Circle size={20} className="hover:text-green-600 transition-colors" />
                                            )}
                                        </button>
                                        <div className="flex-1 flex flex-col min-w-0 pt-0.5">
                                            <span 
                                                onDoubleClick={() => {
                                                    if (!todo.completed) {
                                                        setEditingTodoId(todo.id);
                                                        setEditValue(todo.text);
                                                    }
                                                }}
                                                className={`text-[15px] font-medium leading-relaxed whitespace-pre-wrap break-words ${todo.completed ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-800'}`}
                                            >
                                                {todo.text}
                                            </span>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-400">
                                                <span className="flex items-center gap-1 leading-none" title={t("dashboard.todo.createdAt")}>
                                                    <Clock size={11} className={todo.completed ? "text-gray-300" : "text-green-500"} />
                                                    {new Date(todo.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                            {!todo.completed && (
                                                <button
                                                    onClick={() => {
                                                        setEditingTodoId(todo.id);
                                                        setEditValue(todo.text);
                                                    }}
                                                    className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                                                    title={t("common.edit")}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemoveTodo(todo.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                title={t("dashboard.todo.delete")}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Modal isOpen={isAddTodoModalOpen} onClose={() => setIsAddTodoModalOpen(false)} title={t("dashboard.todo.create")} maxWidth="500px">
                <form onSubmit={handleAddTodo} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t("dashboard.todo.content")} <span className="text-red-500">*</span>
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
                            placeholder={t("dashboard.todo.placeholder")}
                            className="w-full border border-gray-300 rounded-lg p-3 outline-none transition-shadow resize-y min-h-[120px]"
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.2)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = 'none'; }}
                            autoFocus
                        />
                        <p className="mt-1.5 text-xs text-gray-500">
                            {t("dashboard.todo.hint")}
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsAddTodoModalOpen(false)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                            disabled={isSubmitting}
                        >
                            {t("common.cancel")}
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
                            {isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : t("dashboard.todo.submit")}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function InvoiceStatusWidget({ invoices }: { invoices: any[] }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'OVERDUE' | 'DUE_SOON'>('OVERDUE');

    // Normalize now to start of day for accurate comparison
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const activeInvoices = invoices.filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT');

    const overdueInvoices = activeInvoices.filter(inv => {
        if (!inv.dueDate) return false;
        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        return due < now && (inv.totalAmount - (inv.paidAmount || 0)) > 0;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const dueSoonInvoices = activeInvoices.filter(inv => {
        if (!inv.dueDate) return false;
        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        return due >= now && (inv.totalAmount - (inv.paidAmount || 0)) > 0;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const displayInvoices = activeTab === 'OVERDUE' ? overdueInvoices : dueSoonInvoices;

    return (
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-full hover:shadow-md transition-shadow" style={{ minHeight: '430px', maxHeight: '460px' }}>
            <div className="flex justify-between items-center mb-3.5 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#05A613] flex items-center justify-center ring-1 ring-emerald-500/20 shrink-0">
                        <Receipt size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">{t("dashboard.invoice.title")}</h3>
                        <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">Theo dõi hạn thu & công nợ</p>
                    </div>
                </div>
                <a
                    href={`/sales/invoices?filter=${activeTab}`}
                    className="text-xs text-primary hover:text-emerald-700 font-semibold flex items-center gap-1 group/link transition-colors py-1 px-2 rounded-lg hover:bg-emerald-50/60"
                >
                    <span>{t("dashboard.invoice.viewAll")}</span>
                    <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-0.5" />
                </a>
            </div>

            {/* Segmented Pill Tabs */}
            <div className="p-1 bg-slate-100/90 rounded-xl flex gap-1 mb-3.5 border border-slate-200/50">
                <button
                    type="button"
                    className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'OVERDUE'
                            ? 'bg-white text-rose-700 shadow-xs border border-rose-200/60 font-bold'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent'
                    }`}
                    onClick={() => setActiveTab('OVERDUE')}
                >
                    <span>{t("dashboard.invoice.overdue")}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold leading-none ${
                        activeTab === 'OVERDUE' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                        {overdueInvoices.length}
                    </span>
                </button>
                <button
                    type="button"
                    className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'DUE_SOON'
                            ? 'bg-white text-amber-700 shadow-xs border border-amber-200/60 font-bold'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent'
                    }`}
                    onClick={() => setActiveTab('DUE_SOON')}
                >
                    <span>{t("dashboard.invoice.dueSoon")}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold leading-none ${
                        activeTab === 'DUE_SOON' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                        {dueSoonInvoices.length}
                    </span>
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: '350px' }}>
                {displayInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm h-full">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-2.5 text-emerald-500 shadow-xs">
                            <CheckCircle2 size={22} />
                        </div>
                        <span className="text-center px-4 font-medium text-slate-500 text-xs">
                            {activeTab === 'OVERDUE' ? t("dashboard.invoice.emptyOverdue") : t("dashboard.invoice.emptyDueSoon")}
                        </span>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {displayInvoices.map(inv => {
                            const remaining = inv.totalAmount - (inv.paidAmount || 0);
                            const isOverdue = activeTab === 'OVERDUE';
                            return (
                                <div
                                    key={inv.id}
                                    className="group p-3 rounded-xl border border-slate-200/80 bg-white hover:border-emerald-500/40 hover:shadow-xs transition-all duration-150 flex flex-col gap-2"
                                >
                                    {/* Row 1: Code + Due Date */}
                                    <div className="flex items-center justify-between gap-2">
                                        <a
                                            href={`/sales/invoices/${inv.id}`}
                                            className="font-mono font-bold text-xs text-slate-800 group-hover:text-primary transition-colors flex items-center gap-1.5 tracking-tight truncate"
                                            title={inv.code}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-primary"></span>
                                            {inv.code}
                                        </a>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                                            isOverdue
                                                ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                                                : 'bg-amber-50 text-amber-700 border-amber-200/70'
                                        }`}>
                                            <Clock size={11} className={isOverdue ? 'text-rose-500' : 'text-amber-500'} />
                                            {formatDate(new Date(inv.dueDate))}
                                        </span>
                                    </div>

                                    {/* Row 2: Customer Name */}
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate" title={inv.customer?.name}>
                                        <Building2 size={12} className="text-slate-400 shrink-0" />
                                        <span className="truncate font-medium text-slate-600">{inv.customer?.name || 'Khách lẻ'}</span>
                                    </div>

                                    {/* Row 3: Remaining amount */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100/80">
                                        <span className="text-[11px] font-medium text-slate-400">
                                            {t("dashboard.invoice.toBeCollected")}
                                        </span>
                                        <span className={`font-mono font-bold text-xs tracking-tight ${
                                            isOverdue ? 'text-rose-600' : 'text-amber-600'
                                        }`}>
                                            {formatMoney(remaining)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

import { useRouter } from 'next/navigation';
import { AddEventModal } from './AddEventModal';

export function DashboardClient({
    kpiData, userTasks = [], quotes = [], invoices = [], leads = [], savedConfig = "[]",
    users = [], currentEmployeeId = "", isAdminOrManager = false
}: {
    kpiData?: any, userTasks?: any[], quotes?: any[], invoices?: any[], leads?: any[], savedConfig?: string,
    users?: any[], currentEmployeeId?: string, isAdminOrManager?: boolean
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const [tasks, setTasks] = useState<any[]>(userTasks);

    const activeLeads = leads.filter(l => l.status !== 'WON' && l.status !== 'LOST');

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

                // Ensure my_leads_status is present
                if (!migrated.includes('my_leads_status')) {
                    const myWorkIndex = migrated.indexOf('my_work_todo');
                    if (myWorkIndex !== -1) {
                        migrated.splice(myWorkIndex + 1, 0, 'my_leads_status');
                    } else {
                        migrated.push('my_leads_status');
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
        if (!userTasks) {
            setTasks([]);
            return;
        }
        const threshold = new Date().getTime() + 10 * 24 * 60 * 60 * 1000;
        const validTasks = userTasks.filter((task: any) => {
            if (task.startDate) {
                return new Date(task.startDate).getTime() <= threshold;
            }
            return true;
        });
        setTasks(validTasks);
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
        <div className="bg-gray-50/50 min-h-screen p-3.5 xl:p-6 pt-3 xl:pt-4">
            <div className="w-full mx-auto space-y-5 pb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 -mx-1 md:mx-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t("dashboard.header.title")}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{t("dashboard.header.subtitle")}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row md:items-center items-stretch gap-2.5 w-full md:w-auto">
                        <div className="flex items-center gap-2 mr-1">
                           <a href="/sales/estimates/new" className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors border border-emerald-200/60 shadow-xs">
                               <Receipt size={14} className="shrink-0" /> <span className="whitespace-nowrap">Báo giá</span>
                           </a>
                           <a href="/customers" className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors border border-blue-200/60 shadow-xs">
                               <Users size={14} className="shrink-0" /> <span className="whitespace-nowrap">Khách hàng</span>
                           </a>
                           <button onClick={() => setIsAddEventModalOpen(true)} className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-colors border border-indigo-200/60 shadow-xs">
                               <Briefcase size={14} className="shrink-0" /> <span className="whitespace-nowrap">Giao việc</span>
                           </button>
                        </div>
                        {isAdminOrManager && users && users.length > 0 && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{t("dashboard.header.displayBy")}</span>
                                <select
                                    className="flex-1 sm:flex-none px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
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
                                    <option value="">{t("dashboard.header.allEmployees")}</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button
                            onClick={() => setIsCustomizeMode(!isCustomizeMode)}
                            className={`w-full sm:w-auto px-3 py-1.5 rounded-lg font-medium text-xs transition-colors border flex-shrink-0 shadow-xs ${isCustomizeMode ? 'bg-primary text-white border-primary cursor-pointer' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                        >
                            {isCustomizeMode ? "Hoàn tất chỉnh sửa" : t("dashboard.header.customize")}
                        </button>
                    </div>
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
                                                        className={`transition-shadow ${snapshot.isDragging ? 'opacity-90 z-50 rounded-2xl shadow-2xl scale-[1.01]' : ''} ${isCustomizeMode ? 'ring-2 ring-dashed ring-primary/40 bg-primary/5 p-3 rounded-2xl relative cursor-grab active:cursor-grabbing hover:bg-primary/10' : ''}`}
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
                                                            /* KPI Cards - Modernized High-Density Style */
                                                            <div className="gap-3.5 mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                                                                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-sm transition-all duration-200 relative overflow-hidden group">
                                                                    <div className="absolute opacity-0 group-hover:opacity-100 top-0 left-0 w-1 h-full bg-blue-500 transition-opacity"></div>
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("dashboard.kpi.revenue")}</span>
                                                                        <div className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                                                                            <DollarSign size={18} strokeWidth={2.2} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight tabular-nums truncate" title={formatMoney(revenueThisMonth)}>{formatMoney(revenueThisMonth)}</span>
                                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                                            <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${isRevenueUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'}`}>
                                                                                {isRevenueUp ? '↑' : '↓'} {Math.abs(revenueGrowth).toFixed(1)}%
                                                                            </span>
                                                                            <span className="text-[11px] font-medium text-slate-400">{t("dashboard.kpi.vsLastMonth")}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-sm transition-all duration-200 relative overflow-hidden group">
                                                                    <div className="absolute opacity-0 group-hover:opacity-100 top-0 left-0 w-1 h-full bg-indigo-500 transition-opacity"></div>
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("dashboard.kpi.invoices")}</span>
                                                                        <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
                                                                            <Receipt size={18} strokeWidth={2.2} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{invoicesThisMonth}</span>
                                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                                            <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${isInvoiceUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'}`}>
                                                                                {isInvoiceUp ? '↑' : '↓'} {Math.abs(invoiceGrowth).toFixed(1)}%
                                                                            </span>
                                                                            <span className="text-[11px] font-medium text-slate-400">{t("dashboard.kpi.vsLastMonth")}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-sm transition-all duration-200 relative overflow-hidden group">
                                                                    <div className="absolute opacity-0 group-hover:opacity-100 top-0 left-0 w-1 h-full bg-emerald-500 transition-opacity"></div>
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{t("dashboard.kpi.collected")}</span>
                                                                        <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg">
                                                                            <CreditCard size={18} strokeWidth={2.2} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-xl sm:text-2xl font-bold text-emerald-600 tracking-tight tabular-nums truncate" title={formatMoney(paymentsThisMonth)}>{formatMoney(paymentsThisMonth)}</span>
                                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                                            <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${isPaymentUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'}`}>
                                                                                {isPaymentUp ? '↑' : '↓'} {Math.abs(paymentGrowth).toFixed(1)}%
                                                                            </span>
                                                                            <span className="text-[11px] font-medium text-slate-400">{t("dashboard.kpi.vsLastMonth")}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-sm transition-all duration-200 relative overflow-hidden group">
                                                                    <div className="absolute opacity-0 group-hover:opacity-100 top-0 left-0 w-1 h-full bg-orange-500 transition-opacity"></div>
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("dashboard.kpi.debt")}</span>
                                                                        <div className="bg-orange-50 text-orange-600 p-1.5 rounded-lg">
                                                                            <Briefcase size={18} strokeWidth={2.2} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight tabular-nums truncate" title={formatMoney(debtThisMonth)}>{formatMoney(debtThisMonth)}</span>
                                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                                            <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${isDebtUp ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'}`}>
                                                                                {isDebtUp ? '↑' : '↓'} {Math.abs(debtGrowth).toFixed(1)}%
                                                                            </span>
                                                                            <span className="text-[11px] font-medium text-slate-400">{t("dashboard.kpi.vsLastMonth")}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {widgetId === 'my_work_todo' && (
                                                            /* My Work & Todo Row */
                                                            <div className="flex flex-col xl:flex-row gap-4 w-full mb-4 items-stretch">
                                                                {/* Vùng 1: Công việc của tôi */}
                                                                <div className="w-full xl:w-[65%] flex flex-col">
                                                                    <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col h-full">
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                                                                <Briefcase size={18} className="text-blue-500" />
                                                                                {t("dashboard.myWork.title")}
                                                                            </h3>
                                                                            <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{tasks.length} {t("dashboard.myWork.tasksCount")}</span>
                                                                        </div>

                                                                        {tasks.length === 0 ? (
                                                                            <div className="flex-1 flex flex-col justify-center min-h-[220px]">
                                                                                <EmptyState 
                                                                                    icon={Briefcase}
                                                                                    title={t("dashboard.myWork.empty")}
                                                                                    description={t("dashboard.myWork.emptyDesc")}
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="table-wrapper custom-scrollbar" style={{ flex: 1, maxHeight: '280px', overflowY: 'auto' }}>
                                                                                <table style={{ minWidth: '100%' }}>
                                                                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                                                                        <tr>
                                                                                            <th>{t("dashboard.myWork.taskName")}</th>
                                                                                            <th>{t("dashboard.myWork.priority")}</th>
                                                                                            <th>{t("dashboard.myWork.dueDate")}</th>
                                                                                            <th>{t("dashboard.myWork.related")}</th>
                                                                                            <th>{t("dashboard.myWork.status")}</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {tasks.map((task: any) => {
                                                                                            const isDueSoon = task.dueDate && new Date(task.dueDate).getTime() - new Date().getTime() < 86400000 && task.status !== 'DONE';
                                                                                            const overdue = task.dueDate && task.status !== 'DONE' && task.status !== 'CANCELLED' && new Date(task.dueDate).getTime() < new Date().getTime();
                                                                                            const relatedEntityName = task.customer?.name || task.contract?.title || task.quote?.title || task.project?.name || task.lead?.name || '';

                                                                                            let rowClass = 'hover:bg-slate-50/70 transition-colors group';
                                                                                            let rowStyle: React.CSSProperties = {};

                                                                                            if (overdue) {
                                                                                                rowClass = 'animate-overdue-row border-l-4 border-l-rose-500 transition-all group';
                                                                                            } else if (task.status !== 'DONE' && task.status !== 'CANCELLED') {
                                                                                                if (task.priority === 'URGENT') {
                                                                                                    rowStyle = { animation: 'priority-urgent-bg-blink 1.5s linear infinite' };
                                                                                                } else if (task.priority === 'HIGH') {
                                                                                                    rowStyle = { animation: 'priority-high-bg-blink 2s ease-in-out infinite' };
                                                                                                }
                                                                                            }

                                                                                            return (
                                                                                                <tr key={task.id} className={rowClass} style={rowStyle}>
                                                                                                    <td>
                                                                                                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                                            <a href={`/tasks/${task.id}`} className={`text-xs font-semibold truncate max-w-[200px] hover:underline ${overdue ? 'text-rose-950 font-bold' : 'text-blue-600'}`} title={task.title}>
                                                                                                                {task.title}
                                                                                                            </a>
                                                                                                            {overdue && (
                                                                                                                <span className="animate-overdue-badge inline-flex items-center gap-1 border border-rose-300 px-1.5 py-0.5 rounded text-[10px] font-black" style={{ whiteSpace: 'nowrap' }}>
                                                                                                                    QUÁ HẠN
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        <span style={{
                                                                                                            padding: '2px 7px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600,
                                                                                                            backgroundColor: task.priority === 'URGENT' ? '#fef2f2' : (task.priority === 'HIGH' ? '#fff7ed' : '#f1f5f9'),
                                                                                                            color: task.priority === 'URGENT' ? '#dc2626' : (task.priority === 'HIGH' ? '#ea580c' : '#475569'),
                                                                                                            border: `1px solid ${task.priority === 'URGENT' ? '#fecaca' : (task.priority === 'HIGH' ? '#fed7aa' : '#e2e8f0')}`
                                                                                                        }}>
                                                                                                            {task.priority === 'MEDIUM' ? t("dashboard.myWork.priorityMedium") : task.priority === 'HIGH' ? t("dashboard.myWork.priorityHigh") : task.priority === 'URGENT' ? t("dashboard.myWork.priorityUrgent") : t("dashboard.myWork.priorityLow")}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                    <td style={{ fontSize: '0.75rem' }}>
                                                                                                        {task.dueDate ? (
                                                                                                            <span className={overdue ? 'text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 inline-block' : (isDueSoon ? 'text-rose-600 font-semibold' : '')}>
                                                                                                                {formatDate(new Date(task.dueDate))}
                                                                                                            </span>
                                                                                                        ) : '-'}
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        {relatedEntityName ? (
                                                                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{relatedEntityName}</span>
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
                                                                                                                padding: '2px 6px', borderRadius: '6px',
                                                                                                                border: '1px solid #cbd5e1', fontSize: '0.75rem',
                                                                                                                backgroundColor: 'transparent', cursor: 'pointer'
                                                                                                            }}
                                                                                                        >
                                                                                                            <option value="TODO">{t("dashboard.myWork.statusTodo")}</option>
                                                                                                            <option value="IN_PROGRESS">{t("dashboard.myWork.statusInProgress")}</option>
                                                                                                            <option value="REVIEW">{t("dashboard.myWork.statusReview")}</option>
                                                                                                            <option value="DONE">{t("dashboard.myWork.statusDone")}</option>
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
                                                                </div>

                                                                {/* Vùng 2: Công việc cần làm */}
                                                                <div className="w-full xl:w-[35%] flex flex-col">
                                                                    <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col h-full">
                                                                        <TodoListWidget />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {widgetId === 'my_leads_status' && (
                                                            /* My Leads Row */
                                                            <div className="flex flex-col xl:flex-row gap-6 w-full mb-6 items-stretch">
                                                                {/* Vùng 1: Thông tin Lead của tôi */}
                                                                <div className="w-full xl:w-[65%] flex flex-col">
                                                                    <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full">
                                                                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                                                                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                                                                <Users size={20} className="text-blue-500" />
                                                                                {t("dashboard.leads.myLeadsTitle")}
                                                                            </h3>
                                                                            <a href="/sales/leads" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors">
                                                                                {t("dashboard.leads.viewAll")} <span style={{ fontSize: '10px' }}>▶</span>
                                                                            </a>
                                                                        </div>

                                                                        {activeLeads.length === 0 ? (
                                                                            <div className="flex-1 flex flex-col justify-center min-h-[250px]">
                                                                                <EmptyState 
                                                                                    icon={Users}
                                                                                    title={t("dashboard.leads.empty")}
                                                                                    description={t("dashboard.leads.emptyDesc")}
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="table-wrapper custom-scrollbar" style={{ flex: 1, maxHeight: '350px', overflowY: 'auto' }}>
                                                                                <table style={{ minWidth: '100%' }}>
                                                                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f9fafb' }}>
                                                                                        <tr>
                                                                                            <th className="text-left font-semibold text-gray-600 py-3 px-4 border-b border-gray-100">{t("dashboard.leads.code")}</th>
                                                                                            <th className="text-left font-semibold text-gray-600 py-3 px-4 border-b border-gray-100">{t("dashboard.leads.name")}</th>
                                                                                            <th className="text-right font-semibold text-gray-600 py-3 px-4 border-b border-gray-100">{t("dashboard.leads.value")}</th>
                                                                                            <th className="text-center font-semibold text-gray-600 py-3 px-4 border-b border-gray-100">{t("dashboard.leads.status")}</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {activeLeads.slice(0, 50).map((lead: any) => {
                                                                                            const statusColors: any = {
                                                                                                'NEW': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
                                                                                                'CONTACTED': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
                                                                                                'QUALIFIED': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
                                                                                                'PROPOSAL': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100' },
                                                                                                'WON': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
                                                                                                'LOST': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' }
                                                                                            };
                                                                                            const statusLabels: any = {
                                                                                                'NEW': t("dashboard.leads.statusLabel.NEW"), 'CONTACTED': t("dashboard.leads.statusLabel.CONTACTED"), 'QUALIFIED': t("dashboard.leads.statusLabel.QUALIFIED"),
                                                                                                'PROPOSAL': t("dashboard.leads.statusLabel.PROPOSAL"), 'WON': t("dashboard.leads.statusLabel.WON"), 'LOST': t("dashboard.leads.statusLabel.LOST")
                                                                                            };

                                                                                            const sc = statusColors[lead.status] || statusColors['NEW'];
                                                                                            const label = statusLabels[lead.status] || lead.status;
                                                                                            return (
                                                                                                <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors group">
                                                                                                    <td className="py-3 px-4 border-b border-gray-50">
                                                                                                        <a href={`/sales/leads/${lead.id}`} className="text-sm font-semibold text-blue-600 group-hover:underline">
                                                                                                            {lead.code}
                                                                                                        </a>
                                                                                                    </td>
                                                                                                    <td className="py-3 px-4 border-b border-gray-50">
                                                                                                        <div className="text-sm font-medium text-gray-800 line-clamp-1" title={lead.name}>
                                                                                                            {lead.name}
                                                                                                        </div>
                                                                                                    </td>
                                                                                                    <td className="py-3 px-4 border-b border-gray-50 text-right">
                                                                                                        <span className="text-sm font-bold text-gray-700">
                                                                                                            {formatMoney(lead.estimatedValue || 0)}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                    <td className="py-3 px-4 border-b border-gray-50 text-center">
                                                                                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${sc.bg} ${sc.text} ${sc.border}`}>
                                                                                                            {label}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            )
                                                                                        })}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Vùng 2: Biểu đồ trạng thái Lead */}
                                                                <div className="w-full xl:w-[35%] flex flex-col">
                                                                    <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-full min-h-[300px]">
                                                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-3">{t("dashboard.leads.statsTitle")}</h3>

                                                                        {leads.length === 0 ? (
                                                                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                                                                {t("dashboard.leads.emptyStats")}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-full mt-4 relative" style={{ height: '280px' }}>
                                                                                <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                                                                    <PieChart>
                                                                                        <Pie
                                                                                            data={(() => {
                                                                                                const statusCounts: Record<string, number> = {};
                                                                                                leads.forEach((l: any) => {
                                                                                                    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
                                                                                                });
                                                                                                const PIE_COLORS: Record<string, string> = {
                                                                                                    'NEW': '#3b82f6', 'CONTACTED': '#8b5cf6',
                                                                                                    'QUALIFIED': '#f59e0b', 'PROPOSAL': '#f97316',
                                                                                                    'WON': '#10b981', 'LOST': '#ef4444'
                                                                                                };
                                                                                                const PIE_LABELS: Record<string, string> = {
                                                                                                    'NEW': t("dashboard.leads.statusLabel.NEW"), 'CONTACTED': t("dashboard.leads.statusLabel.CONTACTED"), 'QUALIFIED': t("dashboard.leads.statusLabel.QUALIFIED"),
                                                                                                    'PROPOSAL': t("dashboard.leads.statusLabel.PROPOSAL"), 'WON': t("dashboard.leads.statusLabel.WON"), 'LOST': t("dashboard.leads.statusLabel.LOST")
                                                                                                };
                                                                                                return Object.entries(statusCounts).map(([status, count]) => ({
                                                                                                    name: PIE_LABELS[status] || status,
                                                                                                    value: count,
                                                                                                    color: PIE_COLORS[status] || '#9ca3af'
                                                                                                })).sort((a, b) => b.value - a.value);
                                                                                            })()}
                                                                                            cx="50%"
                                                                                            cy="45%"
                                                                                            innerRadius={65}
                                                                                            outerRadius={85}
                                                                                            paddingAngle={5}
                                                                                            dataKey="value"
                                                                                            stroke="none"
                                                                                        >
                                                                                            {(() => {
                                                                                                const statusCounts: Record<string, number> = {};
                                                                                                leads.forEach((l: any) => {
                                                                                                    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
                                                                                                });
                                                                                                const PIE_COLORS: Record<string, string> = {
                                                                                                    'NEW': '#3b82f6', 'CONTACTED': '#8b5cf6',
                                                                                                    'QUALIFIED': '#f59e0b', 'PROPOSAL': '#f97316',
                                                                                                    'WON': '#10b981', 'LOST': '#ef4444'
                                                                                                };
                                                                                                const ordered = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
                                                                                                return ordered.map((entry, index) => (
                                                                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[entry[0]] || '#9ca3af'} />
                                                                                                ))
                                                                                            })()}
                                                                                        </Pie>
                                                                                        <Tooltip
                                                                                            formatter={(value: any) => [`${value} Leads`, 'Số lượng']}
                                                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                                                                                        />
                                                                                        <Legend
                                                                                            verticalAlign="bottom"
                                                                                            height={36}
                                                                                            iconType="circle"
                                                                                            wrapperStyle={{
                                                                                                paddingTop: '20px',
                                                                                                fontSize: '12px',
                                                                                                fontWeight: 500
                                                                                            }}
                                                                                        />
                                                                                    </PieChart>
                                                                                </ResponsiveContainer>
                                                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginTop: '-36px' }}>
                                                                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{t("dashboard.leads.totalLeads")}</span>
                                                                                    <span className="text-3xl font-black text-gray-800">{leads.length}</span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {widgetId === 'cash_flow_chart' && (
                                                            /* Cash Flow Chart & Invoice Status */
                                                            <div className="flex flex-col xl:flex-row gap-6 w-full mb-2 items-stretch">
                                                                {/* Cash Flow Chart - Left Column */}
                                                                {isAdminOrManager && (
                                                                    <div className="w-full xl:w-[65%]">
                                                                        <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm h-full flex flex-col">
                                                                            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-3">{t("dashboard.cashFlow.title")} {new Date().getFullYear()}</h3>
                                                                            <div className="w-full" style={{ height: '350px', marginLeft: '-15px' }}>
                                                                                <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
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
                                                                                                if (name === 'income') label = t("dashboard.cashFlow.income");
                                                                                                if (name === 'expense') label = t("dashboard.cashFlow.expense");
                                                                                                if (name === 'supplierPayment') label = t("dashboard.cashFlow.supplierPaymentShort");
                                                                                                return [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0), label];
                                                                                            }}
                                                                                        />
                                                                                        <Legend
                                                                                            verticalAlign="top"
                                                                                            height={36}
                                                                                            formatter={(value) => {
                                                                                                if (value === 'income') return t("dashboard.cashFlow.income");
                                                                                                if (value === 'expense') return t("dashboard.cashFlow.expense");
                                                                                                if (value === 'supplierPayment') return t("dashboard.cashFlow.supplierPayment");
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

                                                                {/* Invoice Status - Right Column */}
                                                                <div className={`w-full ${isAdminOrManager ? 'xl:w-[35%]' : ''}`}>
                                                                    <InvoiceStatusWidget invoices={invoices || []} />
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
                                    className="font-semibold py-2.5 px-6 flex items-center justify-center gap-2 transition-all w-full sm:w-auto bg-primary text-white hover:bg-primary/90 shadow-sm"
                                    style={{ borderRadius: '0.75rem' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
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
