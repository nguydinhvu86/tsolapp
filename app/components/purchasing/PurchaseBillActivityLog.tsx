'use client';

import React, { useState } from 'react';
import { Activity, Clock, PlusCircle, CheckCircle2, FileEdit, ArrowRightLeft, XCircle, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

interface PurchaseBillActivityLogProps {
    logs: any[];
    billCreator?: any;
    billCreatedAt?: any;
}

export function PurchaseBillActivityLog({ logs, billCreator, billCreatedAt }: PurchaseBillActivityLogProps) {
    const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

    const toggleLog = (id: string) => {
        setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'CREATED':
                return {
                    label: 'Tạo mới',
                    icon: <PlusCircle size={15} className="text-blue-500" />,
                    bg: 'bg-blue-50 border-blue-200 text-blue-700'
                };
            case 'APPROVED':
                return {
                    label: 'Đã duyệt nợ & Nhập kho',
                    icon: <CheckCircle2 size={15} className="text-emerald-500" />,
                    bg: 'bg-emerald-50 border-emerald-200 text-emerald-700'
                };
            case 'ADJUSTED':
                return {
                    label: 'Điều chỉnh hóa đơn',
                    icon: <Layers size={15} className="text-amber-500" />,
                    bg: 'bg-amber-50 border-amber-200 text-amber-700'
                };
            case 'UPDATED':
                return {
                    label: 'Cập nhật',
                    icon: <FileEdit size={15} className="text-indigo-500" />,
                    bg: 'bg-indigo-50 border-indigo-200 text-indigo-700'
                };
            case 'STATUS_CHANGED':
                return {
                    label: 'Đổi trạng thái',
                    icon: <ArrowRightLeft size={15} className="text-purple-500" />,
                    bg: 'bg-purple-50 border-purple-200 text-purple-700'
                };
            case 'CANCELLED':
                return {
                    label: 'Hủy hóa đơn',
                    icon: <XCircle size={15} className="text-rose-500" />,
                    bg: 'bg-rose-50 border-rose-200 text-rose-700'
                };
            default:
                return {
                    label: action,
                    icon: <Activity size={15} className="text-slate-500" />,
                    bg: 'bg-slate-50 border-slate-200 text-slate-700'
                };
        }
    };

    if ((!logs || logs.length === 0) && !billCreator) {
        return (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-2 text-slate-400">
                <Activity size={32} />
                <p className="text-sm font-medium">Chưa có lịch sử hoạt động nào được ghi nhận.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity size={18} className="text-indigo-600" />
                Lịch sử hoạt động & Nhật ký điều chỉnh
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {logs && logs.length > 0 ? (
                    logs.map((log: any) => {
                        const badge = getActionBadge(log.action);
                        const isExpanded = expandedLogs[log.id] !== false; // Default open

                        let parsedDetails: any = null;
                        if (log.details) {
                            try {
                                parsedDetails = JSON.parse(log.details);
                            } catch (e) {
                                parsedDetails = null;
                            }
                        }

                        return (
                            <div key={log.id} className="relative group">
                                {/* Dot indicator */}
                                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center shadow-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                                </div>

                                <div className="bg-slate-50/70 hover:bg-slate-50 transition-all rounded-xl p-3.5 border border-slate-200/80">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
                                                {badge.icon}
                                                {badge.label}
                                            </span>
                                            <span className="text-xs font-bold text-slate-800">
                                                {log.user?.name || log.user?.email || 'Hệ thống'}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Clock size={12} />
                                            {formatDate(log.createdAt)}
                                        </span>
                                    </div>

                                    {/* Content / Diff Details */}
                                    {parsedDetails && parsedDetails.type === 'UPDATE_DIFF' ? (
                                        <div className="mt-2 space-y-2">
                                            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                                                <span>{parsedDetails.summary}</span>
                                                {parsedDetails.changes?.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleLog(log.id)}
                                                        className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0 text-xs"
                                                    >
                                                        {isExpanded ? (
                                                            <><ChevronUp size={14} /> Thu gọn</>
                                                        ) : (
                                                            <><ChevronDown size={14} /> Chi tiết ({parsedDetails.changes.length})</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {isExpanded && parsedDetails.changes && parsedDetails.changes.length > 0 && (
                                                <div className="bg-white rounded-lg p-3 border border-slate-200 text-xs text-slate-700 space-y-1.5 shadow-2xs">
                                                    <ul className="list-disc pl-4 space-y-1.5 m-0">
                                                        {parsedDetails.changes.map((change: string, idx: number) => (
                                                            <li
                                                                key={idx}
                                                                className="leading-relaxed"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: change.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
                                                                }}
                                                            />
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-600 mt-1 m-0">
                                            {log.details || 'Không có mô tả chi tiết.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="relative group">
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                            <div className="text-xs font-semibold text-slate-800">
                                Hóa đơn được khởi tạo bởi <span className="text-indigo-600">{billCreator?.name || 'Hệ thống'}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">{formatDate(billCreatedAt || new Date())}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
