'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Drawer } from '@/app/components/ui/Drawer';
import { formatDate } from '@/lib/utils/formatters';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';
import {
    Briefcase,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Users,
    ExternalLink,
    Edit2,
    Building2,
    FileText,
    Receipt,
    CheckSquare,
    UserCheck,
    Calendar,
    ArrowRight,
    Tag,
    Share2,
    ShieldAlert,
    Copy,
    Check
} from 'lucide-react';

interface TaskQuickViewDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    task: any | null;
    onStatusChange: (id: string, newStatus: string) => Promise<void>;
    onEdit: (task: any) => void;
}

const TASK_STEPS = [
    { key: 'TODO', label: '1. Cần làm', color: 'amber' },
    { key: 'IN_PROGRESS', label: '2. Đang làm', color: 'blue' },
    { key: 'REVIEW', label: '3. Chờ duyệt', color: 'sky' },
    { key: 'DONE', label: '4. Hoàn thành', color: 'emerald' },
];

export function TaskQuickViewDrawer({
    isOpen,
    onClose,
    task,
    onStatusChange,
    onEdit,
}: TaskQuickViewDrawerProps) {
    const [activeTab, setActiveTab] = useState<'content' | 'team' | 'relations'>('content');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    if (!task) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const isOverdue = task.dueDate && task.status !== 'DONE' && task.status !== 'CANCELLED' && new Date(task.dueDate).getTime() < now.getTime();

    // Checklists progress
    const checklists = task.checklists || [];
    const completedChecklists = checklists.filter((c: any) => c.isCompleted).length;
    const checklistPct = checklists.length > 0 ? Math.round((completedChecklists / checklists.length) * 100) : 0;

    // Handle status change from stepper
    const handleStepClick = async (stepKey: string) => {
        if (task.status === stepKey || isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        try {
            await onStatusChange(task.id, stepKey);
        } catch (error) {
            console.error('Failed to update status', error);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    let currentStepIndex = 0;
    if (task.status === 'IN_PROGRESS') currentStepIndex = 1;
    if (task.status === 'REVIEW') currentStepIndex = 2;
    if (task.status === 'DONE') currentStepIndex = 3;

    // Related entities
    const relatedEntities = [
        { type: 'Khách hàng', name: task.customer?.name, link: `/customers/${task.customer?.id}`, phone: task.customer?.phone, icon: Building2 },
        { type: 'Hợp đồng', name: task.contract?.title, link: `/contracts/${task.contract?.id}`, icon: FileText },
        { type: 'Báo giá (Estimate)', name: task.salesEstimate?.code, link: `/sales/estimates/${task.salesEstimate?.id}`, icon: FileText },
        { type: 'Báo giá (Quote)', name: task.quote?.title, link: `/quotes/${task.quote?.id}`, icon: FileText },
        { type: 'Hóa đơn bán hàng', name: task.salesInvoice?.code, link: `/sales/invoices/${task.salesInvoice?.id}`, icon: Receipt },
        { type: 'Cơ hội (Lead)', name: task.lead?.name, link: `/sales/leads/${task.lead?.id}`, icon: Users },
        { type: 'Dự án', name: task.project?.name, link: `/projects/${task.project?.id}`, icon: Briefcase },
    ].filter(e => e.name);

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            width="lg"
            icon={Briefcase}
            title={
                <div className="flex items-center gap-2">
                    <span className="truncate max-w-[420px] font-bold text-slate-900" title={task.title}>
                        {task.title}
                    </span>
                </div>
            }
            subtitle={
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>Tạo bởi {task.creator?.name || 'Hệ thống'}</span>
                    <span>•</span>
                    <span>{formatDate(new Date(task.createdAt))}</span>
                </div>
            }
            badge={
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    task.priority === 'URGENT'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : task.priority === 'HIGH'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                    {task.priority === 'URGENT' ? 'GẤP' : task.priority === 'HIGH' ? 'CAO' : task.priority === 'MEDIUM' ? 'TRUNG BÌNH' : 'THẤP'}
                </span>
            }
            footer={
                <div className="flex items-center justify-between w-full">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onEdit(task);
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                        <Edit2 size={13} />
                        <span>Chỉnh sửa</span>
                    </button>

                    <Link
                        href={`/tasks/${task.id}`}
                        className="px-4 py-1.5 rounded-xl bg-primary hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                        <span>Mở chi tiết đầy đủ</span>
                        <ExternalLink size={13} />
                    </Link>
                </div>
            }
        >
            <div className="space-y-5">
                {/* 4-Step Interactive Stepper */}
                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                        Tiến độ thực hiện (Nhấp để đổi trạng thái)
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                        {TASK_STEPS.map((step, idx) => {
                            const isCurrent = task.status === step.key;
                            const isPast = idx <= currentStepIndex;

                            return (
                                <button
                                    key={step.key}
                                    type="button"
                                    onClick={() => handleStepClick(step.key)}
                                    disabled={isUpdatingStatus}
                                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                                        isCurrent
                                            ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                                            : isPast
                                            ? 'bg-emerald-50/60 text-emerald-700 border-emerald-200'
                                            : 'bg-white/60 text-slate-400 border-slate-200 hover:bg-white hover:text-slate-700'
                                    }`}
                                >
                                    <span className="text-[11px] font-bold truncate w-full">{step.label}</span>
                                    {isCurrent && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse mt-0.5" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Deadline */}
                    <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                        isOverdue
                            ? 'bg-rose-50/80 border-rose-300 text-rose-900'
                            : 'bg-slate-50 border-slate-200/80'
                    }`}>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hạn chót</span>
                            <Clock size={13} className={isOverdue ? 'text-rose-600' : 'text-slate-400'} />
                        </div>
                        <div>
                            <span className={`text-xs font-bold font-mono ${isOverdue ? 'text-rose-700' : 'text-slate-800'}`}>
                                {task.dueDate ? formatDate(new Date(task.dueDate)) : 'Chưa đặt'}
                            </span>
                            {isOverdue && (
                                <span className="block text-[9.5px] font-black text-rose-600 uppercase mt-0.5">
                                    QUÁ HẠN XỬ LÝ
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Checklists */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Checklist</span>
                            <CheckSquare size={13} className="text-slate-400" />
                        </div>
                        <div>
                            <span className="text-xs font-black font-mono text-slate-800">
                                {completedChecklists}/{checklists.length}
                            </span>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${checklistPct}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Priority */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mức ưu tiên</span>
                            <AlertTriangle size={13} className="text-slate-400" />
                        </div>
                        <div>
                            <span className={`text-xs font-bold ${
                                task.priority === 'URGENT' ? 'text-rose-600' : task.priority === 'HIGH' ? 'text-amber-600' : 'text-slate-800'
                            }`}>
                                {task.priority === 'URGENT' ? 'Khẩn cấp' : task.priority === 'HIGH' ? 'Cao' : task.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
                            </span>
                            <span className="block text-[9.5px] text-slate-400 mt-0.5">
                                {task.isPublic ? 'Công khai' : 'Riêng tư'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-slate-200 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('content')}
                        className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                            activeTab === 'content'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Nội dung & Checklist ({checklists.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('team')}
                        className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                            activeTab === 'team'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Nhân sự thực hiện ({task.assignees?.length || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('relations')}
                        className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                            activeTab === 'relations'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Liên kết ERP ({relatedEntities.length})
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'content' && (
                    <div className="space-y-4">
                        {/* Description */}
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                Mô tả chi tiết
                            </span>
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[70px]">
                                {task.description || 'Chưa có mô tả chi tiết cho công việc này.'}
                            </div>
                        </div>

                        {/* Checklist items */}
                        {checklists.length > 0 && (
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                    Danh sách đầu việc (Checklist)
                                </span>
                                <div className="space-y-1.5">
                                    {checklists.map((item: any, i: number) => (
                                        <div
                                            key={i}
                                            className="p-2.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                                    item.isCompleted ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                                                }`}>
                                                    {item.isCompleted && <Check size={11} />}
                                                </div>
                                                <span className={item.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                                                    {item.content || item.title || `Mục ${i + 1}`}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-4">
                        {/* Assignees */}
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                Người phụ trách chính ({task.assignees?.length || 0})
                            </span>
                            {task.assignees && task.assignees.length > 0 ? (
                                <div className="space-y-2">
                                    {task.assignees.map((a: any, idx: number) => {
                                        const u = a.user;
                                        return (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between gap-3"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                                                        {(u.name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-900 block">{u.name}</span>
                                                        <span className="text-[11px] text-slate-400">{u.email}</span>
                                                    </div>
                                                </div>

                                                {u.phone && (
                                                    <ClickToCallButton phoneNumber={u.phone} size="sm" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400">Chưa phân công người phụ trách.</span>
                            )}
                        </div>

                        {/* Observers */}
                        {task.observers && task.observers.length > 0 && (
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                    Người theo dõi ({task.observers.length})
                                </span>
                                <div className="space-y-2">
                                    {task.observers.map((o: any, idx: number) => {
                                        const u = o.user;
                                        return (
                                            <div
                                                key={idx}
                                                className="p-2.5 rounded-xl border border-slate-200/70 bg-slate-50 flex items-center justify-between"
                                            >
                                                <span className="text-xs font-semibold text-slate-700">{u.name}</span>
                                                <span className="text-[10px] text-slate-400">{u.email}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'relations' && (
                    <div className="space-y-2.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Các đối tượng liên kết trong hệ thống ERP
                        </span>
                        {relatedEntities.length === 0 ? (
                            <span className="text-xs text-slate-400">Công việc này chưa liên kết với khách hàng hay đơn hàng cụ thể nào.</span>
                        ) : (
                            relatedEntities.map((ent, idx) => {
                                const Icon = ent.icon;
                                return (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                <Icon size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">{ent.type}</span>
                                                <Link
                                                    href={ent.link}
                                                    className="text-xs font-bold text-blue-600 hover:underline truncate block"
                                                >
                                                    {ent.name}
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {ent.phone && (
                                                <ClickToCallButton phoneNumber={ent.phone} size="sm" />
                                            )}
                                            <Link
                                                href={ent.link}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                            >
                                                <ArrowRight size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </Drawer>
    );
}
