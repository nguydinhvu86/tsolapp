'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ArrowLeft,
    Target,
    Calendar,
    Users,
    LayoutDashboard,
    MessageSquare,
    FileText,
    BarChart2,
    Link as LinkIcon,
    Milestone,
    Paperclip,
    Trash2,
    Clock,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Briefcase,
    FileSignature,
    Receipt,
    Calculator,
    Plus,
    ShoppingCart,
    CreditCard,
    Send,
    AlertTriangle,
    Edit2,
    Building2,
    CheckCircle2,
    TrendingUp,
    AlertCircle,
    ExternalLink,
    ShieldAlert,
    Timer,
    Flame,
    PauseCircle,
    Eye
} from 'lucide-react';

import { Button } from '@/app/components/ui/Button';
import { TaskDashboardClient } from '@/app/tasks/TaskDashboardClient';
import { formatDate } from '@/lib/utils/formatters';
import { uploadTaskAttachment, deleteTaskAttachment } from '@/app/tasks/actions';
import {
    addProjectComment,
    toggleProjectReaction,
    createProjectTopic,
    updateProjectIssueStatus,
    updateProjectRiskStatus
} from '@/app/projects/actions';
import { CreateIssueModal } from './CreateIssueModal';
import { CreateRiskModal } from './CreateRiskModal';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '👀'];

interface ProjectDetailClientProps {
    project: any;
    users: any[];
}

export function ProjectDetailClient({ project, users = [] }: ProjectDetailClientProps) {
    const router = useRouter();
    const { data: session } = useSession();

    // Active Tab
    const [activeTab, setActiveTab] = useState<
        'OVERVIEW' | 'FINANCIALS' | 'SALES' | 'PROCUREMENT' | 'TASKS' | 'ISSUES_RISKS' | 'TIMESHEETS' | 'FILES' | 'DISCUSSIONS'
    >('OVERVIEW');

    // Modals
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [editingIssueData, setEditingIssueData] = useState<any>(null);
    const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
    const [editingRiskData, setEditingRiskData] = useState<any>(null);

    // Discussions Forum
    const generalTopic = {
        id: 'GENERAL',
        title: 'Thảo Luận Chung',
        comments: project.comments?.filter((c: any) => !c.topicId) || []
    };
    const allTopics = [generalTopic, ...(project.topics || [])];

    const [selectedTopic, setSelectedTopic] = useState<any>(generalTopic);
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicContent, setNewTopicContent] = useState('');
    const [newComment, setNewComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Upload Progress
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

    // Task Progress calculation
    const totalTasks = project.tasks?.length || 0;
    const completedTasks = project.tasks?.filter((t: any) => t.status === 'DONE').length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Derived Milestones
    const milestones = project.tasks?.filter((t: any) => t.priority === 'URGENT' || t.priority === 'HIGH') || [];

    // Financial calculations
    const expectedRevenue = project.salesEstimate?.totalAmount || project.estimatedValue || 0;
    
    // Total invoiced sales revenue
    const allInvoices = project.invoices || (project.invoice ? [project.invoice] : []);
    const actualRevenue = allInvoices.reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0);
    const actualCollected = allInvoices.reduce((sum: number, inv: any) => sum + (inv.paidAmount || 0), 0);

    // Procurement and Expenses
    const allPurchaseBills = project.purchaseBills || [];
    const totalPurchaseCost = allPurchaseBills.reduce((sum: number, bill: any) => sum + (bill.totalAmount || 0), 0);

    const allExpenses = project.expenses || [];
    const totalExpenseCost = allExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);

    // Labor Cost from tracking timesheets
    let totalLaborCost = 0;
    let totalLaborSeconds = 0;
    const timesheetEntries: any[] = [];

    project.tasks?.forEach((task: any) => {
        task.timeLogs?.forEach((log: any) => {
            const hourlyRate = log.user?.employeeProfile?.hourlyRate || 0;
            const durationSec = log.durationSec || 0;
            totalLaborSeconds += durationSec;
            const hours = durationSec / 3600;
            const cost = hours * hourlyRate;
            totalLaborCost += cost;

            timesheetEntries.push({
                ...log,
                taskTitle: task.title,
                taskId: task.id,
                hourlyRate,
                calculatedCost: cost
            });
        });
    });

    const totalCost = totalPurchaseCost + totalExpenseCost + totalLaborCost;
    const grossProfit = actualRevenue - totalCost;
    const profitMargin = actualRevenue > 0 ? (grossProfit / actualRevenue) * 100 : 0;
    const budget = project.budget || project.estimatedValue || 0;
    const budgetUsedPct = budget > 0 ? (totalCost / budget) * 100 : 0;

    // Sales Arrays
    const allSalesEstimates = project.salesEstimates || (project.salesEstimate ? [project.salesEstimate] : []);
    const allSalesOrders = project.salesOrders || (project.salesOrder ? [project.salesOrder] : []);
    const allQuotes = project.quotes || (project.quote ? [project.quote] : []);
    const allContracts = project.contracts || (project.contract ? [project.contract] : []);
    const allPurchaseOrders = project.purchaseOrders || [];

    // Comments & Discussions
    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !session?.user?.id || !selectedTopic) return;

        const finalHtml = newComment.replace(/\n/g, '<br/>');
        setIsSaving(true);
        try {
            await addProjectComment(project.id, finalHtml, selectedTopic.id === 'GENERAL' ? undefined : selectedTopic.id);
            setNewComment('');
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicTitle.trim() || !newTopicContent.trim() || !session?.user?.id) return;
        setIsSaving(true);
        try {
            await createProjectTopic(project.id, newTopicTitle.trim(), newTopicContent.trim());
            setNewTopicTitle('');
            setNewTopicContent('');
            setIsCreatingTopic(false);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleReaction = async (commentId: string, emoji: string) => {
        if (!session?.user?.id) return;
        await toggleProjectReaction(commentId, emoji, project.id);
        router.refresh();
    };

    // File Upload
    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !session?.user?.id) return;
        setIsSaving(true);
        try {
            for (const file of Array.from(e.target.files)) {
                if (file.size > 50 * 1024 * 1024) continue;

                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const url = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', '/api/upload', true);

                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                const percentComplete = Math.round((event.loaded / event.total) * 100);
                                setUploadProgress(prev => ({ ...prev, [file.name]: percentComplete }));
                            }
                        };

                        xhr.onload = () => {
                            if (xhr.status === 200) {
                                try {
                                    const response = JSON.parse(xhr.responseText);
                                    if (response.url) resolve(response.url);
                                    else reject(new Error('Upload failed'));
                                } catch (err) {
                                    reject(new Error('Invalid response'));
                                }
                            } else {
                                reject(new Error('Upload failed'));
                            }
                        };

                        xhr.onerror = () => reject(new Error('Network error'));
                        xhr.send(formData);
                    });

                    await uploadTaskAttachment(project.id, file.name, url, file.type, session.user.id);
                } catch (err: any) {
                    console.error('Upload failed for', file.name, err);
                } finally {
                    setUploadProgress(prev => {
                        const next = { ...prev };
                        delete next[file.name];
                        return next;
                    });
                }
            }
            setTimeout(() => router.refresh(), 500);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
            e.target.value = '';
        }
    };

    const handleDocDelete = async (attachmentId: string) => {
        if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
        if (!session?.user?.id) return;
        setIsSaving(true);
        try {
            await deleteTaskAttachment(attachmentId, session.user.id);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    // Helper functions for badges
    const renderStatusBadge = (st: string) => {
        switch (st) {
            case 'PLANNING':
            case 'TODO':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> Chuẩn Bị
                    </span>
                );
            case 'IN_PROGRESS':
            case 'RUNNING':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Đang Chạy
                    </span>
                );
            case 'ON_HOLD':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <PauseCircle className="w-3.5 h-3.5 text-purple-500" /> Tạm Dừng
                    </span>
                );
            case 'COMPLETED':
            case 'DONE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Hoàn Thành
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Đã Hủy
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {st}
                    </span>
                );
        }
    };

    const renderPriorityBadge = (pr: string) => {
        switch (pr) {
            case 'URGENT':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                        <Flame className="w-3.5 h-3.5 text-red-500" /> Khẩn cấp
                    </span>
                );
            case 'HIGH':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                        Ưu tiên cao
                    </span>
                );
            case 'MEDIUM':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        Bình thường
                    </span>
                );
            case 'LOW':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Thấp
                    </span>
                );
            default:
                return <span className="text-xs text-gray-500">{pr}</span>;
        }
    };

    // Navigation Tabs Definition
    const tabs = [
        { id: 'OVERVIEW', label: 'Tổng Quan', icon: Target, badge: null },
        { id: 'FINANCIALS', label: 'Tài Chính & P&L', icon: DollarSign, badge: `${profitMargin.toFixed(0)}%` },
        { id: 'SALES', label: 'Bán Hàng', icon: Calculator, badge: allSalesEstimates.length + allInvoices.length + allContracts.length || null },
        { id: 'PROCUREMENT', label: 'Mua Hàng & Chi Phí', icon: ShoppingCart, badge: allPurchaseBills.length + allExpenses.length || null },
        { id: 'TASKS', label: 'Bảng Công Việc', icon: LayoutDashboard, badge: totalTasks || null },
        { id: 'ISSUES_RISKS', label: 'Vấn Đề & Rủi Ro', icon: ShieldAlert, badge: (project.issues?.length || 0) + (project.risks?.length || 0) || null },
        { id: 'TIMESHEETS', label: 'Chấm Công', icon: Clock, badge: timesheetEntries.length || null },
        { id: 'FILES', label: 'Tủ Hồ Sơ', icon: FileText, badge: project.attachments?.length || null },
        { id: 'DISCUSSIONS', label: 'Thảo Luận', icon: MessageSquare, badge: (project.comments?.length || 0) + (project.topics?.length || 0) || null },
    ];

    return (
        <div className="space-y-6">
            {/* Top Navigation & Hero Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                {/* Top Bar: Back Link & Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/projects"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-slate-200"
                        >
                            <ArrowLeft className="w-4 h-4" /> Danh sách dự án
                        </Link>
                        <span className="text-slate-300">/</span>
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {project.code || 'PRJ'}
                        </span>
                    </div>

                    {/* Quick Document Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={`/sales/estimates?action=new&projectId=${project.id}${project.customerId ? `&customerId=${project.customerId}` : ''}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5 text-indigo-500" /> Báo Giá ERP
                        </Link>

                        <Link
                            href={`/sales/orders?action=new&projectId=${project.id}${project.customerId ? `&customerId=${project.customerId}` : ''}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5 text-blue-500" /> Đơn Bán Hàng
                        </Link>

                        <Link
                            href={`/sales/invoices?action=new&projectId=${project.id}${project.customerId ? `&customerId=${project.customerId}` : ''}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5 text-emerald-500" /> Hóa Đơn Bán
                        </Link>

                        <Link
                            href={`/purchasing/orders?action=new&projectId=${project.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5 text-amber-500" /> Mua Hàng NCC
                        </Link>

                        <Link
                            href={`/sales/expenses?action=new&projectId=${project.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5 text-rose-500" /> Chi Phí Khác
                        </Link>
                    </div>
                </div>

                {/* Hero Title & Main Stats */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                            {renderStatusBadge(project.status || 'PLANNING')}
                            {renderPriorityBadge(project.priority || 'MEDIUM')}
                            {project.customer && (
                                <Link
                                    href={`/customers/${project.customer.id}`}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1 rounded-full border border-slate-200 transition-colors"
                                >
                                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                    {project.customer.name}
                                </Link>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {project.title || project.name}
                        </h1>

                        {/* Dates & Members info */}
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500 font-medium">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span>Bắt đầu: <strong className="text-slate-700">{project.startDate ? formatDate(new Date(project.startDate)) : formatDate(new Date(project.createdAt))}</strong></span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span>Hạn chót: <strong className={project.dueDate && new Date(project.dueDate).getTime() < Date.now() ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                    {project.dueDate ? formatDate(new Date(project.dueDate)) : 'Chưa thiết lập'}
                                </strong></span>
                            </div>

                            {project.estimatedDuration && (
                                <div className="flex items-center gap-1.5">
                                    <Timer className="w-4 h-4 text-slate-400" />
                                    <span>Thời gian: <strong className="text-slate-700">{project.estimatedDuration}</strong></span>
                                </div>
                            )}

                            {/* Team Members */}
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">Đội ngũ:</span>
                                <div className="flex items-center -space-x-1.5">
                                    {(project.members || []).map((m: any, idx: number) => {
                                        const u = m.user || m;
                                        return (
                                            <div
                                                key={idx}
                                                title={u.name || u.email}
                                                className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm"
                                            >
                                                {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Metric Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tiến độ</div>
                            <div className="text-xl font-black text-indigo-600 mt-0.5">{progress}%</div>
                            <div className="text-[11px] text-slate-500">{completedTasks}/{totalTasks} việc</div>
                        </div>

                        <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Doanh thu</div>
                            <div className="text-lg font-black text-emerald-600 mt-0.5 truncate" title={actualRevenue.toLocaleString('vi-VN') + ' ₫'}>
                                {actualRevenue.toLocaleString('vi-VN')} ₫
                            </div>
                            <div className="text-[11px] text-slate-500">Đã thu: {actualCollected.toLocaleString('vi-VN')} ₫</div>
                        </div>

                        <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng chi phí</div>
                            <div className="text-lg font-black text-rose-600 mt-0.5 truncate" title={totalCost.toLocaleString('vi-VN') + ' ₫'}>
                                {totalCost.toLocaleString('vi-VN')} ₫
                            </div>
                            <div className="text-[11px] text-slate-500">Ngân sách: {budget.toLocaleString('vi-VN')} ₫</div>
                        </div>

                        <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lợi nhuận P&L</div>
                            <div className={`text-lg font-black mt-0.5 truncate ${grossProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`} title={grossProfit.toLocaleString('vi-VN') + ' ₫'}>
                                {grossProfit.toLocaleString('vi-VN')} ₫
                            </div>
                            <div className="text-[11px] text-slate-500">Biên LN: {profitMargin.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>

                {/* Sub-Tabs Bar */}
                <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-4 -mx-2 px-2 scrollbar-none">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {tab.badge !== null && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-200 text-slate-700'
                                        }`}
                                    >
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB CONTENTS */}

            {/* 1. OVERVIEW TAB */}
            {activeTab === 'OVERVIEW' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left Column (2 Cols) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Project Description Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-indigo-600" /> Mô Tả Mục Tiêu Dự Án
                                </h3>
                                {project.tags && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {project.tags.split(',').map((t: string, idx: number) => (
                                            <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                                                #{t.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                {project.description || 'Chưa có mô tả chi tiết về dự án này.'}
                            </div>
                        </div>

                        {/* Milestones / Key Tasks */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Milestone className="w-4 h-4 text-indigo-600" /> Cột Mốc & Công Việc Trọng Điểm
                                </h3>
                                <span className="text-xs text-slate-500 font-medium">
                                    {milestones.length} công việc ưu tiên cao/khẩn cấp
                                </span>
                            </div>

                            {milestones.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-6">
                                    Chưa có công việc nào được đánh dấu ưu tiên Cao hoặc Khẩn cấp.
                                </p>
                            ) : (
                                <div className="space-y-2.5">
                                    {milestones.map((m: any) => (
                                        <div
                                            key={m.id}
                                            className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 transition-colors"
                                        >
                                            <div className="space-y-1">
                                                <Link
                                                    href={`/tasks/${m.id}`}
                                                    className="font-semibold text-sm text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
                                                >
                                                    {m.title}
                                                </Link>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span>Hạn: <strong className="text-slate-700">{m.dueDate ? formatDate(new Date(m.dueDate)) : 'Chưa định'}</strong></span>
                                                    <span>•</span>
                                                    <span>Giao cho: {m.assignees?.map((a: any) => a.user?.name || a.user?.email).join(', ') || 'Chưa gán'}</span>
                                                </div>
                                            </div>

                                            <span
                                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    m.status === 'DONE'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}
                                            >
                                                {m.status === 'DONE' ? 'Hoàn thành' : 'Đang xử lý'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Budget & Cost Progress */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <BarChart2 className="w-4 h-4 text-indigo-600" /> Ngân Sách & Chi Phí Dự Án
                                </h3>
                                <span className={`text-xs font-bold ${budgetUsedPct > 100 ? 'text-rose-600' : 'text-slate-600'}`}>
                                    Đã dùng {budgetUsedPct.toFixed(1)}% ngân sách
                                </span>
                            </div>

                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        budgetUsedPct > 100
                                            ? 'bg-rose-500'
                                            : budgetUsedPct > 80
                                            ? 'bg-amber-500'
                                            : 'bg-indigo-500'
                                    }`}
                                    style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                                <div>
                                    <span className="text-slate-400 block">Đã chi thực tế:</span>
                                    <strong className="text-rose-600 font-bold text-sm">{totalCost.toLocaleString('vi-VN')} ₫</strong>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Ngân sách trần:</span>
                                    <strong className="text-slate-800 font-bold text-sm">{budget.toLocaleString('vi-VN')} ₫</strong>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 block">Còn lại:</span>
                                    <strong className={`font-bold text-sm ${budget - totalCost < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {(budget - totalCost).toLocaleString('vi-VN')} ₫
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (1 Col) */}
                    <div className="space-y-6">
                        {/* Customer Information Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-indigo-600" /> Khách Hàng / Đối Tác
                            </h3>
                            {project.customer ? (
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Tên công ty / KH</span>
                                        <Link
                                            href={`/customers/${project.customer.id}`}
                                            className="font-bold text-slate-900 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 mt-0.5"
                                        >
                                            {project.customer.name}
                                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                        </Link>
                                    </div>
                                    {project.customer.phone && (
                                        <div>
                                            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Điện thoại</span>
                                            <span className="text-slate-700 font-medium">{project.customer.phone}</span>
                                        </div>
                                    )}
                                    {project.customer.email && (
                                        <div>
                                            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Email</span>
                                            <span className="text-slate-700 font-medium">{project.customer.email}</span>
                                        </div>
                                    )}
                                    {project.customer.address && (
                                        <div>
                                            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">Địa chỉ</span>
                                            <span className="text-slate-700 font-medium">{project.customer.address}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">Dự án này chưa được liên kết với hồ sơ khách hàng.</p>
                            )}
                        </div>

                        {/* Project Creator & Members Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-600" /> Ban Quản Trị & Đội Ngũ
                            </h3>
                            <div className="space-y-3">
                                {project.creator && (
                                    <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                            {(project.creator.name || 'C').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-900 truncate">{project.creator.name || project.creator.email}</div>
                                            <div className="text-[11px] text-indigo-600 font-semibold">Người tạo / Project Manager</div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 pt-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                                        Thành viên ({project.members?.length || 0})
                                    </span>
                                    {(project.members || []).map((m: any, idx: number) => {
                                        const u = m.user || m;
                                        return (
                                            <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                                                    {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="truncate">{u.name || u.email}</span>
                                            </div>
                                        );
                                    })}
                                    {(!project.members || project.members.length === 0) && (
                                        <p className="text-xs text-slate-400">Chưa có thành viên nào tham gia.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Navigation Links */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-indigo-600" /> Chứng Từ Liên Quan
                            </h3>
                            <div className="space-y-2 text-xs">
                                {project.salesEstimate && (
                                    <Link
                                        href={`/sales/estimates/${project.salesEstimate.id}`}
                                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-colors border border-slate-100"
                                    >
                                        <span className="font-semibold">Báo Giá ERP: {project.salesEstimate.code}</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                                {project.quote && (
                                    <Link
                                        href={`/quotes/${project.quote.id}`}
                                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-colors border border-slate-100"
                                    >
                                        <span className="font-semibold">Báo Giá VB: {project.quote.title}</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                                {project.contract && (
                                    <Link
                                        href={`/contracts/${project.contract.id}`}
                                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-colors border border-slate-100"
                                    >
                                        <span className="font-semibold">Hợp Đồng: {project.contract.title}</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                                {project.invoice && (
                                    <Link
                                        href={`/sales/invoices/${project.invoice.id}`}
                                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-colors border border-slate-100"
                                    >
                                        <span className="font-semibold">Hóa Đơn Bán: {project.invoice.code}</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                                {!project.salesEstimate && !project.quote && !project.contract && !project.invoice && (
                                    <p className="text-slate-400 py-2">Chưa có chứng từ nào được liên kết trực tiếp.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. FINANCIALS (P&L) TAB */}
            {activeTab === 'FINANCIALS' && (
                <div className="space-y-6">
                    {/* P&L Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50/40 to-white">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Doanh thu thực tế</span>
                                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                                    <ArrowUpRight className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-2xl font-black text-emerald-700">{actualRevenue.toLocaleString('vi-VN')} ₫</span>
                                <span className="text-xs text-emerald-600 block mt-1">Dự kiến: {expectedRevenue.toLocaleString('vi-VN')} ₫</span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm bg-gradient-to-br from-rose-50/40 to-white">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Tổng chi phí thực tế</span>
                                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                                    <ArrowDownRight className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-2xl font-black text-rose-700">{totalCost.toLocaleString('vi-VN')} ₫</span>
                                <span className="text-xs text-rose-500 block mt-1">
                                    Vật tư: {totalPurchaseCost.toLocaleString('vi-VN')} ₫ | Nhân công: {totalLaborCost.toLocaleString('vi-VN')} ₫
                                </span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm bg-gradient-to-br from-blue-50/40 to-white">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Lợi nhuận gộp (P&L)</span>
                                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className={`text-2xl font-black ${grossProfit >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                                    {grossProfit.toLocaleString('vi-VN')} ₫
                                </span>
                                <span className="text-xs text-blue-600 block mt-1">Biên LN: {profitMargin.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm bg-gradient-to-br from-indigo-50/40 to-white">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Ngân sách dự án</span>
                                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                                    <Target className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <span className="text-2xl font-black text-indigo-700">{budget.toLocaleString('vi-VN')} ₫</span>
                                <span className="text-xs text-indigo-600 block mt-1">Đã dùng {budgetUsedPct.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Cost Breakdown Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Breakdown */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-emerald-600" /> Doanh Thu Bán Hàng & Hóa Đơn ({allInvoices.length})
                                </h3>
                                <Link
                                    href={`/sales/invoices?action=new&projectId=${project.id}${project.customerId ? `&customerId=${project.customerId}` : ''}`}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Tạo HĐ Bán
                                </Link>
                            </div>

                            <div className="space-y-2.5">
                                {allInvoices.map((inv: any) => (
                                    <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <Link href={`/sales/invoices/${inv.id}`} className="font-bold text-xs text-slate-900 hover:text-indigo-600">
                                                {inv.code}
                                            </Link>
                                            <div className="text-[11px] text-slate-500">
                                                Ngày: {inv.date ? formatDate(new Date(inv.date)) : '-'} | Đã thu: <strong className="text-emerald-600">{(inv.paidAmount || 0).toLocaleString('vi-VN')} ₫</strong>
                                            </div>
                                        </div>
                                        <span className="font-extrabold text-sm text-slate-800">
                                            {(inv.totalAmount || 0).toLocaleString('vi-VN')} ₫
                                        </span>
                                    </div>
                                ))}
                                {allInvoices.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-4">Chưa có hóa đơn bán hàng nào được xuất.</p>
                                )}
                            </div>
                        </div>

                        {/* Purchase & Subcontractor Costs */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-rose-600" /> Chi Phí Mua Vật Tư & Dịch Vụ ({allPurchaseBills.length})
                                </h3>
                                <Link
                                    href={`/purchasing/bills?action=new&projectId=${project.id}`}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Thêm HĐ Mua
                                </Link>
                            </div>

                            <div className="space-y-2.5">
                                {allPurchaseBills.map((bill: any) => (
                                    <div key={bill.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <Link href={`/purchasing/bills/${bill.id}`} className="font-bold text-xs text-slate-900 hover:text-indigo-600">
                                                {bill.code}
                                            </Link>
                                            <div className="text-[11px] text-slate-500">
                                                NCC: <strong>{bill.supplier?.name || '-'}</strong> | Đã trả: {(bill.paidAmount || 0).toLocaleString('vi-VN')} ₫
                                            </div>
                                        </div>
                                        <span className="font-extrabold text-sm text-rose-600">
                                            {(bill.totalAmount || 0).toLocaleString('vi-VN')} ₫
                                        </span>
                                    </div>
                                ))}
                                {allPurchaseBills.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-4">Chưa có hóa đơn mua hàng nào.</p>
                                )}
                            </div>
                        </div>

                        {/* Labor Costs from Timesheets */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-600" /> Chi Phí Nhân Công Từ Chấm Công
                                </h3>
                                <span className="text-xs font-bold text-blue-700">
                                    {(totalLaborSeconds / 3600).toFixed(1)} giờ làm
                                </span>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Tổng số nhật ký giờ làm:</span>
                                    <strong className="text-slate-900">{timesheetEntries.length} lượt</strong>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Tổng số giờ làm việc:</span>
                                    <strong className="text-slate-900">{(totalLaborSeconds / 3600).toFixed(1)} giờ</strong>
                                </div>
                                <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
                                    <span className="font-bold">Tổng chi phí nhân sự ước tính:</span>
                                    <strong className="text-rose-600 font-extrabold text-sm">{totalLaborCost.toLocaleString('vi-VN')} ₫</strong>
                                </div>
                            </div>
                        </div>

                        {/* Other Expenses */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-amber-600" /> Chi Phí Khác (Tiếp khách, đi lại...) ({allExpenses.length})
                                </h3>
                                <Link
                                    href={`/sales/expenses?action=new&projectId=${project.id}`}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Tạo Phiếu Chi
                                </Link>
                            </div>

                            <div className="space-y-2.5">
                                {allExpenses.map((exp: any) => (
                                    <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <Link href={`/sales/expenses/${exp.id}`} className="font-bold text-xs text-slate-900 hover:text-indigo-600">
                                                {exp.code}
                                            </Link>
                                            <div className="text-[11px] text-slate-500 line-clamp-1">{exp.description || 'Chi phí hoạt động'}</div>
                                        </div>
                                        <span className="font-extrabold text-sm text-rose-600">
                                            {(exp.amount || 0).toLocaleString('vi-VN')} ₫
                                        </span>
                                    </div>
                                ))}
                                {allExpenses.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-4">Chưa có khoản chi phí khác.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. SALES TAB */}
            {activeTab === 'SALES' && (
                <div className="space-y-6">
                    {/* Sales Estimates */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Calculator className="w-4 h-4 text-indigo-600" /> Báo Giá ERP ({allSalesEstimates.length})
                                </h3>
                                <p className="text-xs text-slate-500">Báo giá chi tiết theo danh mục sản phẩm/dịch vụ trên hệ thống</p>
                            </div>
                            <Link
                                href={`/sales/estimates?action=new&projectId=${project.id}${project.customerId ? `&customerId=${project.customerId}` : ''}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Tạo Báo Giá ERP
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                                        <th className="py-2.5 px-3">Mã Báo Giá</th>
                                        <th className="py-2.5 px-3">Ngày Lập</th>
                                        <th className="py-2.5 px-3">Tổng Tiền</th>
                                        <th className="py-2.5 px-3">Trạng Thái</th>
                                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allSalesEstimates.map((est: any) => (
                                        <tr key={est.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-3 font-semibold text-slate-900">
                                                <Link href={`/sales/estimates/${est.id}`} className="text-indigo-600 hover:underline">
                                                    {est.code}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">{est.date ? formatDate(new Date(est.date)) : '-'}</td>
                                            <td className="py-3 px-3 font-bold text-slate-900">{(est.totalAmount || 0).toLocaleString('vi-VN')} ₫</td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${est.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                                    {est.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <Link href={`/sales/estimates/${est.id}`} className="text-indigo-600 hover:underline font-semibold">
                                                    Xem chi tiết
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {allSalesEstimates.length === 0 && (
                                        <tr><td colSpan={5} className="py-6 text-center text-slate-400">Chưa có Báo Giá ERP nào liên kết với dự án này.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sales Orders */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-blue-600" /> Đơn Bán Hàng ({allSalesOrders.length})
                                </h3>
                                <p className="text-xs text-slate-500">Đơn hàng bán xác nhận với khách hàng</p>
                            </div>
                            <Link
                                href={`/sales/orders?action=new&projectId=${project.id}${project.customerId ? `&customerId=${project.customerId}` : ''}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Tạo Đơn Hàng Mới
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                                        <th className="py-2.5 px-3">Mã Đơn Hàng</th>
                                        <th className="py-2.5 px-3">Ngày Lập</th>
                                        <th className="py-2.5 px-3">Tổng Tiền</th>
                                        <th className="py-2.5 px-3">Trạng Thái</th>
                                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allSalesOrders.map((so: any) => (
                                        <tr key={so.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-3 font-semibold text-slate-900">
                                                <Link href={`/sales/orders/${so.id}`} className="text-blue-600 hover:underline">
                                                    {so.code}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">{so.date ? formatDate(new Date(so.date)) : '-'}</td>
                                            <td className="py-3 px-3 font-bold text-slate-900">{(so.totalAmount || 0).toLocaleString('vi-VN')} ₫</td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${so.status === 'CONFIRMED' || so.status === 'DONE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                                    {so.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <Link href={`/sales/orders/${so.id}`} className="text-blue-600 hover:underline font-semibold">
                                                    Xem chi tiết
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {allSalesOrders.length === 0 && (
                                        <tr><td colSpan={5} className="py-6 text-center text-slate-400">Chưa có Đơn Bán Hàng nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sales Invoices */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-emerald-600" /> Hóa Đơn Bán Hàng ({allInvoices.length})
                                </h3>
                                <p className="text-xs text-slate-500">Quản lý các đợt xuất hóa đơn và thu tiền dự án</p>
                            </div>
                            <Link
                                href={`/sales/invoices?action=new&projectId=${project.id}${project.customerId ? `&customerId=${project.customerId}` : ''}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Tạo Hóa Đơn Bán
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                                        <th className="py-2.5 px-3">Mã Hóa Đơn</th>
                                        <th className="py-2.5 px-3">Ngày Lập</th>
                                        <th className="py-2.5 px-3">Tổng Tiền</th>
                                        <th className="py-2.5 px-3">Đã Thu</th>
                                        <th className="py-2.5 px-3">Còn Lại</th>
                                        <th className="py-2.5 px-3">Trạng Thái</th>
                                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allInvoices.map((inv: any) => {
                                        const remaining = (inv.totalAmount || 0) - (inv.paidAmount || 0);
                                        return (
                                            <tr key={inv.id} className="hover:bg-slate-50">
                                                <td className="py-3 px-3 font-semibold text-slate-900">
                                                    <Link href={`/sales/invoices/${inv.id}`} className="text-emerald-600 hover:underline">
                                                        {inv.code}
                                                    </Link>
                                                </td>
                                                <td className="py-3 px-3 text-slate-600">{inv.date ? formatDate(new Date(inv.date)) : '-'}</td>
                                                <td className="py-3 px-3 font-bold text-slate-900">{(inv.totalAmount || 0).toLocaleString('vi-VN')} ₫</td>
                                                <td className="py-3 px-3 font-bold text-emerald-600">{(inv.paidAmount || 0).toLocaleString('vi-VN')} ₫</td>
                                                <td className="py-3 px-3 font-bold text-rose-600">{remaining > 0 ? remaining.toLocaleString('vi-VN') + ' ₫' : '0 ₫'}</td>
                                                <td className="py-3 px-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <Link href={`/sales/invoices/${inv.id}`} className="text-emerald-600 hover:underline font-semibold">
                                                        Xem chi tiết
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {allInvoices.length === 0 && (
                                        <tr><td colSpan={7} className="py-6 text-center text-slate-400">Chưa có hóa đơn bán hàng nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Contracts & Quotes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contracts */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FileSignature className="w-4 h-4 text-purple-600" /> Hợp Đồng ({allContracts.length})
                                </h3>
                                <Link
                                    href={`/contracts/new?projectId=${project.id}${project.customerId ? `&customerId=${project.customerId}` : ''}`}
                                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Tạo Hợp Đồng
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {allContracts.map((c: any) => (
                                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <Link href={`/contracts/${c.id}`} className="font-bold text-xs text-slate-900 hover:text-indigo-600 line-clamp-1">
                                                {c.title}
                                            </Link>
                                            <div className="text-[11px] text-slate-500">Ký ngày: {c.createdAt ? formatDate(new Date(c.createdAt)) : '-'}</div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">{c.status}</span>
                                    </div>
                                ))}
                                {allContracts.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-4">Chưa có hợp đồng nào.</p>
                                )}
                            </div>
                        </div>

                        {/* Quotes */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-amber-600" /> Báo Giá Văn Bản ({allQuotes.length})
                                </h3>
                                <Link
                                    href={`/quotes/new?projectId=${project.id}${project.customerId ? `&customerId=${project.customerId}` : ''}`}
                                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Tạo Báo Giá VB
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {allQuotes.map((q: any) => (
                                    <div key={q.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <Link href={`/quotes/${q.id}`} className="font-bold text-xs text-slate-900 hover:text-indigo-600 line-clamp-1">
                                                {q.title}
                                            </Link>
                                            <div className="text-[11px] text-slate-500">Ngày lập: {q.createdAt ? formatDate(new Date(q.createdAt)) : '-'}</div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">{q.status}</span>
                                    </div>
                                ))}
                                {allQuotes.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-4">Chưa có báo giá văn bản nào.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. PROCUREMENT & EXPENSES TAB */}
            {activeTab === 'PROCUREMENT' && (
                <div className="space-y-6">
                    {/* Purchase Orders */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-indigo-600" /> Đơn Mua Hàng Nhà Cung Cấp ({allPurchaseOrders.length})
                                </h3>
                                <p className="text-xs text-slate-500">Quản lý PO đặt hàng vật tư, thiết bị cho dự án</p>
                            </div>
                            <Link
                                href={`/purchasing/orders?action=new&projectId=${project.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Tạo Đơn Mua Mới
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                                        <th className="py-2.5 px-3">Mã Đơn Mua</th>
                                        <th className="py-2.5 px-3">Ngày Lập</th>
                                        <th className="py-2.5 px-3">Nhà Cung Cấp</th>
                                        <th className="py-2.5 px-3">Tổng Tiền</th>
                                        <th className="py-2.5 px-3">Trạng Thái</th>
                                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allPurchaseOrders.map((po: any) => (
                                        <tr key={po.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-3 font-semibold text-slate-900">
                                                <Link href={`/purchasing/orders/${po.id}`} className="text-indigo-600 hover:underline">
                                                    {po.code}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">{po.date ? formatDate(new Date(po.date)) : '-'}</td>
                                            <td className="py-3 px-3 font-medium text-slate-800">{po.supplier?.name || '-'}</td>
                                            <td className="py-3 px-3 font-bold text-slate-900">{(po.totalAmount || 0).toLocaleString('vi-VN')} ₫</td>
                                            <td className="py-3 px-3">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <Link href={`/purchasing/orders/${po.id}`} className="text-indigo-600 hover:underline font-semibold">
                                                    Xem chi tiết
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {allPurchaseOrders.length === 0 && (
                                        <tr><td colSpan={6} className="py-6 text-center text-slate-400">Chưa có đơn mua hàng NCC nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Purchase Bills */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-rose-600" /> Hóa Đơn Mua Hàng NCC ({allPurchaseBills.length})
                                </h3>
                                <p className="text-xs text-slate-500">Hóa đơn đầu vào và công nợ với các nhà cung cấp</p>
                            </div>
                            <Link
                                href={`/purchasing/bills?action=new&projectId=${project.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Tạo HĐ Mua Mới
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                                        <th className="py-2.5 px-3">Mã Hóa Đơn</th>
                                        <th className="py-2.5 px-3">Ngày Lập</th>
                                        <th className="py-2.5 px-3">Nhà Cung Cấp</th>
                                        <th className="py-2.5 px-3">Tổng Tiền</th>
                                        <th className="py-2.5 px-3">Đã Thanh Toán</th>
                                        <th className="py-2.5 px-3">Trạng Thái</th>
                                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allPurchaseBills.map((bill: any) => (
                                        <tr key={bill.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-3 font-semibold text-slate-900">
                                                <Link href={`/purchasing/bills/${bill.id}`} className="text-rose-600 hover:underline">
                                                    {bill.code}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">{bill.date ? formatDate(new Date(bill.date)) : '-'}</td>
                                            <td className="py-3 px-3 font-medium text-slate-800">{bill.supplier?.name || '-'}</td>
                                            <td className="py-3 px-3 font-bold text-rose-600">{(bill.totalAmount || 0).toLocaleString('vi-VN')} ₫</td>
                                            <td className="py-3 px-3 font-bold text-emerald-600">{(bill.paidAmount || 0).toLocaleString('vi-VN')} ₫</td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${bill.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                                    {bill.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <Link href={`/purchasing/bills/${bill.id}`} className="text-rose-600 hover:underline font-semibold">
                                                    Xem chi tiết
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {allPurchaseBills.length === 0 && (
                                        <tr><td colSpan={7} className="py-6 text-center text-slate-400">Chưa có hóa đơn mua hàng nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Expenses */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-amber-600" /> Chi Phí Khác ({allExpenses.length})
                                </h3>
                                <p className="text-xs text-slate-500">Các khoản chi tiêu tiếp khách, đi lại, phụ cấp phát sinh cho dự án</p>
                            </div>
                            <Link
                                href={`/sales/expenses?action=new&projectId=${project.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Tạo Phiếu Chi Mới
                            </Link>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                                        <th className="py-2.5 px-3">Mã Phiếu Chi</th>
                                        <th className="py-2.5 px-3">Ngày Chi</th>
                                        <th className="py-2.5 px-3">Mô Tả / Lý Do</th>
                                        <th className="py-2.5 px-3">Số Tiền</th>
                                        <th className="py-2.5 px-3">Trạng Thái</th>
                                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allExpenses.map((exp: any) => (
                                        <tr key={exp.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-3 font-semibold text-slate-900">
                                                <Link href={`/sales/expenses/${exp.id}`} className="text-amber-600 hover:underline">
                                                    {exp.code}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">{exp.date ? formatDate(new Date(exp.date)) : '-'}</td>
                                            <td className="py-3 px-3 text-slate-800">{exp.description || '-'}</td>
                                            <td className="py-3 px-3 font-bold text-rose-600">{(exp.amount || 0).toLocaleString('vi-VN')} ₫</td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${exp.status === 'APPROVED' || exp.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                                    {exp.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <Link href={`/sales/expenses/${exp.id}`} className="text-amber-600 hover:underline font-semibold">
                                                    Xem chi tiết
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {allExpenses.length === 0 && (
                                        <tr><td colSpan={6} className="py-6 text-center text-slate-400">Chưa có khoản chi phí nào.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. TASKS TAB */}
            {activeTab === 'TASKS' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <TaskDashboardClient
                        initialTasks={project.tasks || []}
                        users={users}
                        parentProjectId={project.id}
                        parentProject={project}
                        canCreateTask={true}
                    />
                </div>
            )}

            {/* 6. ISSUES & RISKS TAB */}
            {activeTab === 'ISSUES_RISKS' && (
                <div className="space-y-6">
                    {/* Issues Section */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Sự Cố & Vấn Đề (Issues) ({project.issues?.length || 0})
                                </h3>
                                <p className="text-xs text-slate-500">Ghi nhận các trở ngại, rào cản và phương án giải quyết theo RAG</p>
                            </div>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setEditingIssueData(null);
                                    setIsIssueModalOpen(true);
                                }}
                                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                            >
                                <Plus className="w-3.5 h-3.5" /> Ghi Nhận Sự Cố
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                                        <th className="py-2.5 px-3">Mức Độ (RAG)</th>
                                        <th className="py-2.5 px-3">Vấn Đề</th>
                                        <th className="py-2.5 px-3">Phương Án Xử Lý</th>
                                        <th className="py-2.5 px-3">Người Báo</th>
                                        <th className="py-2.5 px-3">Trạng Thái</th>
                                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(project.issues || []).map((issue: any) => (
                                        <tr key={issue.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        issue.severity === 'RED'
                                                            ? 'bg-red-100 text-red-800'
                                                            : issue.severity === 'AMBER'
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-emerald-100 text-emerald-800'
                                                    }`}
                                                >
                                                    {issue.severity === 'RED' ? 'ĐỎ - Nghiêm trọng' : issue.severity === 'AMBER' ? 'VÀNG - Cảnh báo' : 'XANH - Bình thường'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="font-bold text-slate-900">{issue.title}</div>
                                                {issue.description && <div className="text-slate-500 line-clamp-1 mt-0.5">{issue.description}</div>}
                                            </td>
                                            <td className="py-3 px-3 text-slate-700">{issue.mitigationPlan || '-'}</td>
                                            <td className="py-3 px-3 text-slate-600">{issue.reportedBy?.name || '-'}</td>
                                            <td className="py-3 px-3">
                                                <select
                                                    value={issue.status}
                                                    onChange={async (e) => {
                                                        await updateProjectIssueStatus(issue.id, e.target.value, project.id);
                                                        router.refresh();
                                                    }}
                                                    className="py-1 px-2 text-xs font-semibold rounded-lg bg-slate-50 border border-slate-200"
                                                >
                                                    <option value="OPEN">Mở (Open)</option>
                                                    <option value="IN_PROGRESS">Đang Xử Lý</option>
                                                    <option value="RESOLVED">Đã Khắc Phục</option>
                                                    <option value="CLOSED">Đóng (Closed)</option>
                                                </select>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingIssueData(issue);
                                                        setIsIssueModalOpen(true);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-800 font-semibold p-1"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!project.issues || project.issues.length === 0) && (
                                        <tr><td colSpan={6} className="py-6 text-center text-slate-400">Không có sự cố nào được ghi nhận. Dự án đang vận hành an toàn!</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Risks Section */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-amber-600" /> Quản Lý Rủi Ro (Risk Matrix) ({project.risks?.length || 0})
                                </h3>
                                <p className="text-xs text-slate-500">Đánh giá xác suất và mức độ tác động của các nguy cơ tiềm ẩn</p>
                            </div>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    setEditingRiskData(null);
                                    setIsRiskModalOpen(true);
                                }}
                                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                            >
                                <Plus className="w-3.5 h-3.5" /> Nhận Diện Rủi Ro Mới
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                                        <th className="py-2.5 px-3">Tên Rủi Ro</th>
                                        <th className="py-2.5 px-3">Xác Suất (%)</th>
                                        <th className="py-2.5 px-3">Mức Độ Tác Động</th>
                                        <th className="py-2.5 px-3">Người Nhận Diện</th>
                                        <th className="py-2.5 px-3">Trạng Thái</th>
                                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(project.risks || []).map((risk: any) => (
                                        <tr key={risk.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-3">
                                                <div className="font-bold text-slate-900">{risk.title}</div>
                                                {risk.description && <div className="text-slate-500 line-clamp-1 mt-0.5">{risk.description}</div>}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-indigo-600">{risk.probability || 50}%</span>
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${risk.probability || 50}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        risk.impact === 'CRITICAL'
                                                            ? 'bg-red-100 text-red-800'
                                                            : risk.impact === 'HIGH'
                                                            ? 'bg-orange-100 text-orange-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                    }`}
                                                >
                                                    {risk.impact}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">{risk.creator?.name || '-'}</td>
                                            <td className="py-3 px-3">
                                                <select
                                                    value={risk.status}
                                                    onChange={async (e) => {
                                                        await updateProjectRiskStatus(risk.id, e.target.value, project.id);
                                                        router.refresh();
                                                    }}
                                                    className="py-1 px-2 text-xs font-semibold rounded-lg bg-slate-50 border border-slate-200"
                                                >
                                                    <option value="OPEN">Chưa Xử Lý (Open)</option>
                                                    <option value="MITIGATED">Đã Giảm Thiểu</option>
                                                    <option value="CLOSED">Đã Đóng</option>
                                                </select>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingRiskData(risk);
                                                        setIsRiskModalOpen(true);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-800 font-semibold p-1"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!project.risks || project.risks.length === 0) && (
                                        <tr><td colSpan={6} className="py-6 text-center text-slate-400">Chưa có rủi ro nào được nhận diện.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 7. TIMESHEETS TAB */}
            {activeTab === 'TIMESHEETS' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-indigo-600" /> Nhật Ký Chấm Công & Giờ Làm Việc ({timesheetEntries.length})
                            </h3>
                            <p className="text-xs text-slate-500">Tổng hợp thời gian thực tế nhân sự làm việc trên các công việc của dự án</p>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                            <div className="text-xs">
                                <span className="text-slate-400 block">Tổng thời gian:</span>
                                <strong className="text-indigo-600 font-black text-sm">{(totalLaborSeconds / 3600).toFixed(1)} giờ</strong>
                            </div>
                            <div className="text-xs border-l border-slate-200 pl-4">
                                <span className="text-slate-400 block">Chi phí nhân sự:</span>
                                <strong className="text-rose-600 font-black text-sm">{totalLaborCost.toLocaleString('vi-VN')} ₫</strong>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                                    <th className="py-2.5 px-3">Nhân Viên</th>
                                    <th className="py-2.5 px-3">Công Việc Liên Quan</th>
                                    <th className="py-2.5 px-3">Bắt Đầu</th>
                                    <th className="py-2.5 px-3">Kết Thúc</th>
                                    <th className="py-2.5 px-3">Thời Lượng</th>
                                    <th className="py-2.5 px-3">Đơn Giá / Giờ</th>
                                    <th className="py-2.5 px-3 text-right">Chi Phí Tạm Tính</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {timesheetEntries.map((log: any, idx: number) => {
                                    const durationHours = (log.durationSec || 0) / 3600;
                                    const mins = Math.floor(((log.durationSec || 0) % 3600) / 60);
                                    const hrs = Math.floor(durationHours);

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="py-3 px-3 font-semibold text-slate-900">
                                                {log.user?.name || log.user?.email || 'Thành viên'}
                                            </td>
                                            <td className="py-3 px-3">
                                                <Link href={`/tasks/${log.taskId}`} className="text-indigo-600 hover:underline font-medium">
                                                    {log.taskTitle}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">{log.startTime ? formatDate(new Date(log.startTime)) : '-'}</td>
                                            <td className="py-3 px-3 text-slate-600">{log.endTime ? formatDate(new Date(log.endTime)) : 'Đang bấm giờ...'}</td>
                                            <td className="py-3 px-3 font-mono font-bold text-indigo-600">{hrs}h {mins}m</td>
                                            <td className="py-3 px-3 text-slate-600 font-medium">{log.hourlyRate ? log.hourlyRate.toLocaleString('vi-VN') + ' ₫' : '0 ₫'}</td>
                                            <td className="py-3 px-3 text-right font-bold text-rose-600">{(log.calculatedCost || 0).toLocaleString('vi-VN')} ₫</td>
                                        </tr>
                                    );
                                })}
                                {timesheetEntries.length === 0 && (
                                    <tr><td colSpan={7} className="py-8 text-center text-slate-400">Chưa có bản ghi chấm công thời gian nào.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 8. FILES TAB */}
            {activeTab === 'FILES' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-indigo-600" /> Tủ Hồ Sơ & Tài Liệu Dự Án ({project.attachments?.length || 0})
                            </h3>
                            <p className="text-xs text-slate-500">Tải lên tài liệu kỹ thuật, bản vẽ, hợp đồng scan, biên bản nghiệm thu</p>
                        </div>

                        <div>
                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                                <Plus className="w-4 h-4" /> Tải Lên Tài Liệu Mới
                                <input type="file" multiple onChange={handleDocUpload} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Upload progress bars */}
                    {Object.keys(uploadProgress).length > 0 && (
                        <div className="space-y-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                            {Object.entries(uploadProgress).map(([fileName, progress]) => (
                                <div key={fileName} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                                        <span className="truncate">{fileName}</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Files Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {(project.attachments || []).map((file: any) => (
                            <div key={file.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between group">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 flex-shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-xs text-slate-900 truncate" title={file.name}>
                                            {file.name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                            {file.createdAt ? formatDate(new Date(file.createdAt)) : '-'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100">
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Xem / Tải
                                    </a>
                                    <button
                                        onClick={() => handleDocDelete(file.id)}
                                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                        title="Xóa tài liệu"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {(!project.attachments || project.attachments.length === 0) && (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                            <Paperclip className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-600">Chưa có tệp đính kèm nào</p>
                            <p className="text-xs text-slate-400 mt-1">Bấm nút "Tải Lên Tài Liệu Mới" để lưu trữ hồ sơ dự án</p>
                        </div>
                    )}
                </div>
            )}

            {/* 9. DISCUSSIONS TAB */}
            {activeTab === 'DISCUSSIONS' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                    {/* Topic Sidebar */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Chủ Đề</h4>
                            <button
                                onClick={() => setIsCreatingTopic(true)}
                                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Thêm
                            </button>
                        </div>

                        <div className="space-y-1">
                            {allTopics.map((top: any) => (
                                <button
                                    key={top.id}
                                    onClick={() => setSelectedTopic(top)}
                                    className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                                        selectedTopic?.id === top.id
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    <span className="truncate">{top.title}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedTopic?.id === top.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        {top.comments?.length || 0}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Discussions Feed */}
                    <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-indigo-600" />
                                {selectedTopic?.title || 'Thảo Luận Chung'}
                            </h3>
                            <span className="text-xs text-slate-400">
                                {selectedTopic?.comments?.length || 0} bình luận
                            </span>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {(selectedTopic?.comments || []).map((comment: any) => (
                                <div key={comment.id} className="flex items-start gap-3 group">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                        {(comment.user?.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-slate-900">
                                                {comment.user?.name || comment.user?.email || 'Thành viên'}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi }) : ''}
                                            </span>
                                        </div>
                                        <div
                                            className="text-xs text-slate-700 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: comment.content }}
                                        />
                                        {/* Reactions */}
                                        <div className="flex items-center gap-1 pt-1">
                                            {EMOJIS.map((emoji) => {
                                                const hasReacted = comment.reactions?.some((r: any) => r.emoji === emoji && r.userId === session?.user?.id);
                                                const count = comment.reactions?.filter((r: any) => r.emoji === emoji).length || 0;
                                                return (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => handleToggleReaction(comment.id, emoji)}
                                                        className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                                                            hasReacted
                                                                ? 'bg-indigo-50 border-indigo-300 scale-105'
                                                                : 'bg-white border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        {emoji} {count > 0 && <span className="font-bold text-[10px] text-slate-600">{count}</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {(!selectedTopic?.comments || selectedTopic.comments.length === 0) && (
                                <p className="text-center text-xs text-slate-400 py-8">Chưa có phản hồi nào trong chủ đề này. Hãy gửi bình luận đầu tiên!</p>
                            )}
                        </div>

                        {/* Comment Input */}
                        <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-4 border-t border-slate-100">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Nhập ý kiến thảo luận, trao đổi..."
                                className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isSaving || !newComment.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5"
                            >
                                <Send className="w-3.5 h-3.5" /> Gửi
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALS */}
            <CreateIssueModal
                projectId={project.id}
                isOpen={isIssueModalOpen}
                onClose={() => setIsIssueModalOpen(false)}
                initialData={editingIssueData}
            />

            <CreateRiskModal
                projectId={project.id}
                isOpen={isRiskModalOpen}
                onClose={() => setIsRiskModalOpen(false)}
                initialData={editingRiskData}
            />
        </div>
    );
}
