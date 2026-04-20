'use client';
import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import ExpenseClient, { ExpenseWithDetails } from '@/app/sales/expenses/ExpenseClient';
import { MarketingCampaign, MarketingCategory } from '@prisma/client';
import { Calendar, Users, Briefcase, ChevronLeft, Target, Wallet } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import Link from 'next/link';

export type CampaignDetailData = MarketingCampaign & {
    category: MarketingCategory;
    creator: { id: string; name: string | null; email: string | null };
    tasks: any[];
    expenses: ExpenseWithDetails[];
    forms: any[];
    participants: any[];
};

export default function CampaignDetailClient({
    campaign,
    users,
    expenseCategories,
    suppliers,
    customers,
    isAdmin,
    permissions,
}: {
    campaign: CampaignDetailData;
    users: any[];
    expenseCategories: any[];
    suppliers: any[];
    customers: any[];
    isAdmin: boolean;
    permissions: string[];
}) {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PLANNING' | 'BUDGET'>('OVERVIEW');

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800';
            case 'COMPLETED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800';
            case 'DRAFT': default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
        }
    };

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Đang diễn ra';
            case 'COMPLETED': return 'Đã kết thúc';
            case 'CANCELLED': return 'Đã hủy';
            case 'DRAFT': default: return 'Bản nháp';
        }
    };

    const actualExpense = campaign.expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const budgetRemaining = (campaign.budget || 0) - actualExpense;

    return (
        <div className="space-y-6 w-full">
            {/* Header section with back button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/marketing/campaigns">
                        <Button variant="secondary" className="p-2 h-10 w-10 flex items-center justify-center rounded-full">
                            <ChevronLeft size={20} />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {campaign.name}
                            </h2>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusStyle(campaign.status)}`}>
                                {getStatusDisplay(campaign.status)}
                            </span>
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>Mã: <strong className="font-semibold">{campaign.code}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Target size={14}/> {campaign.category?.name}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 flex flex-col justify-center">
                    <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                        <Calendar size={16} /> Thời gian
                    </div>
                    <div className="text-sm font-semibold truncate mt-1">
                        {campaign.startDate ? formatDate(campaign.startDate) : '--'}
                        {' đến '}
                        {campaign.endDate ? formatDate(campaign.endDate) : '--'}
                    </div>
                </Card>
                <Card className="p-5 flex flex-col justify-center">
                    <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                        <Wallet size={16} /> Ngân sách dự kiến
                    </div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {formatMoney(campaign.budget || 0)}
                    </div>
                </Card>
                <Card className="p-5 flex flex-col justify-center">
                    <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                        <Briefcase size={16} /> Tiến độ Công việc
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {campaign.tasks.filter(t => t.status === 'DONE').length} 
                            <span className="text-lg text-slate-400 font-medium mx-1">/</span> 
                            <span className="text-lg text-slate-700 dark:text-slate-300 font-semibold">{campaign.tasks.length}</span>
                        </div>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                            <div className="h-full bg-blue-500" style={{ width: `${campaign.tasks.length > 0 ? (campaign.tasks.filter(t => t.status === 'DONE').length / campaign.tasks.length * 100) : 0}%` }}></div>
                        </div>
                    </div>
                </Card>
                <Card className="p-5 flex flex-col justify-center">
                    <div className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                        <Users size={16} /> Người tham gia / Đăng ký
                    </div>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                         {campaign.participants.length}
                    </div>
                </Card>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-slate-200 dark:border-slate-800 mt-6 overflow-x-auto whitespace-nowrap">
                <nav className="-mb-px flex space-x-6 min-w-max px-2">
                    {[
                        { id: 'OVERVIEW', label: 'Tổng quan' },
                        { id: 'PLANNING', label: 'Kế hoạch Tổ chức' },
                        { id: 'BUDGET', label: 'Ngân sách & Chi Phí' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Contents */}
            <div className="mt-6">
                {activeTab === 'OVERVIEW' && (
                    <Card className="p-6 md:p-8">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Chi tiết Chiến dịch</h3>
                        <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {campaign.description || 'Chưa có mô tả chi tiết.'}
                        </div>
                        <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Thông tin người tạo</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                    {(campaign.creator?.name || campaign.creator?.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{campaign.creator?.name || '-'}</span>
                                    <span className="text-xs">{campaign.creator?.email || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {activeTab === 'PLANNING' && (
                    <div className="w-full">
                        <TaskPanel 
                            initialTasks={campaign.tasks}
                            users={users}
                            entityType="MARKETING_CAMPAIGN"
                            entityId={campaign.id}
                            initialTitle={`Công việc: ${campaign.name}`}
                        />
                    </div>
                )}

                {activeTab === 'BUDGET' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="p-5 border-l-4 border-l-slate-400 bg-slate-50 dark:bg-slate-900/50">
                                <div className="text-sm font-medium text-slate-500 mb-1">Ngân sách cho phép</div>
                                <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatMoney(campaign.budget || 0)}</div>
                            </Card>
                            <Card className="p-5 border-l-4 border-l-rose-500 bg-rose-50/50 dark:bg-rose-900/10">
                                <div className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1">Thực chi hiện tại</div>
                                <div className="text-xl font-bold text-rose-700 dark:text-rose-300">{formatMoney(actualExpense)}</div>
                            </Card>
                            <Card className={`p-5 border-l-4 ${budgetRemaining >= 0 ? 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10'}`}>
                                <div className={`text-sm font-medium mb-1 ${budgetRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {budgetRemaining >= 0 ? 'Ngân sách còn lại' : 'Vượt ngân sách'}
                                </div>
                                <div className={`text-xl font-bold ${budgetRemaining >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                                    {formatMoney(Math.abs(budgetRemaining))}
                                </div>
                            </Card>
                        </div>

                        {/* Rendering the ExpenseClient locally for this campaign */}
                        {/* Note: In a real system, the ExpenseClient has "Quản lý Chi phí" title in its wrapper, but since its native Card doesn't have a title, it blends nicely */}
                        <div className="-mx-2 md:mx-0">
                            <ExpenseClient
                                initialData={campaign.expenses}
                                categories={expenseCategories}
                                suppliers={suppliers}
                                customers={customers}
                                isAdmin={isAdmin}
                                permissions={permissions}
                                campaignId={campaign.id}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
