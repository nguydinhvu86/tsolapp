'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { Drawer } from '@/app/components/ui/Drawer';
import { formatDate } from '@/lib/utils/formatters';
import { toast } from '@/app/components/providers/ToastProvider';
import {
    FileText,
    ExternalLink,
    Copy,
    Check,
    Building2,
    ArrowRight,
    Edit
} from 'lucide-react';

interface ContractQuickViewDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    contract: any | null;
    onStatusChange: (id: string, newStatus: string) => void;
    onEdit: (contract: any) => void;
    canEdit: boolean;
}

const STATUS_STEPS = [
    { key: 'DRAFT', label: '1. Khởi tạo nháp' },
    { key: 'SENT', label: '2. Đã gửi khách' },
    { key: 'SIGNED', label: '3. Hoàn tất ký kết' }
];

export function ContractQuickViewDrawer({
    isOpen,
    onClose,
    contract,
    onStatusChange,
    onEdit,
    canEdit
}: ContractQuickViewDrawerProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'preview'>('overview');
    const [copiedLink, setCopiedLink] = useState(false);

    if (!contract) return null;

    const handleCopyShareLink = () => {
        const url = `${window.location.origin}/public/contracts/${contract.id}`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        toast.success('Đã sao chép liên kết xem trước hợp đồng', url);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    let currentStepIndex = 0;
    if (contract.status === 'SENT') currentStepIndex = 1;
    if (contract.status === 'SIGNED') currentStepIndex = 2;
    const isCancelled = contract.status === 'CANCELLED';

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={contract.title || 'Xem nhanh Hợp đồng'}
            subtitle={
                <span className="flex items-center gap-2 text-[12.5px]">
                    <span>Mẫu: {contract.template?.name || 'Chuẩn'}</span>
                    <span>•</span>
                    <span>Ngày tạo: {formatDate(contract.createdAt)}</span>
                </span>
            }
            icon={FileText}
            width="xl"
            badge={
                <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border"
                    style={{
                        backgroundColor:
                            contract.status === 'SIGNED' ? '#ecfdf5' :
                            contract.status === 'SENT' ? '#f0f9ff' :
                            contract.status === 'CANCELLED' ? '#fff1f2' : '#fffbeb',
                        color:
                            contract.status === 'SIGNED' ? '#047857' :
                            contract.status === 'SENT' ? '#0369a1' :
                            contract.status === 'CANCELLED' ? '#be123c' : '#b45309',
                        borderColor:
                            contract.status === 'SIGNED' ? '#a7f3d0' :
                            contract.status === 'SENT' ? '#bae6fd' :
                            contract.status === 'CANCELLED' ? '#fecdd3' : '#fde68a'
                    }}
                >
                    {contract.status === 'SIGNED' ? 'Đã ký' : contract.status === 'SENT' ? 'Đã gửi' : contract.status === 'CANCELLED' ? 'Đã hủy' : 'Bản nháp'}
                </span>
            }
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2 w-full font-sans">
                    <button
                        type="button"
                        onClick={handleCopyShareLink}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                        {copiedLink ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                        <span>{copiedLink ? 'Đã chép link' : 'Copy link ký khách'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onEdit(contract);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
                            >
                                <Edit size={15} />
                                <span>Sửa nội dung</span>
                            </button>
                        )}
                        <Link
                            href={`/contracts/${contract.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                            <ExternalLink size={15} />
                            <span>Xem chi tiết & In</span>
                        </Link>
                    </div>
                </div>
            }
        >
            <div className="space-y-4 font-sans">
                {/* Pipeline Stepper */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11.5px] font-bold text-slate-600 uppercase tracking-wider">
                            Trạng thái Hợp đồng
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-[12.5px] text-slate-500">Đổi trạng thái:</span>
                            <select
                                value={contract.status}
                                onChange={(e) => onStatusChange(contract.id, e.target.value)}
                                disabled={!canEdit}
                                className="text-[12.5px] font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-emerald-600 shadow-2xs"
                            >
                                <option value="DRAFT">Bản nháp</option>
                                <option value="SENT">Đã gửi khách</option>
                                <option value="SIGNED">Đã ký kết</option>
                                <option value="CANCELLED">Hủy bỏ</option>
                            </select>
                        </div>
                    </div>

                    {!isCancelled ? (
                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                            {STATUS_STEPS.map((step, idx) => {
                                const isDone = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;
                                return (
                                    <div key={step.key} className="flex flex-col gap-1.5">
                                        <div className="h-2 w-full rounded-full overflow-hidden bg-slate-200">
                                            <div
                                                className={`h-full transition-all duration-300 ${
                                                    isDone ? 'bg-emerald-500' : 'bg-transparent'
                                                }`}
                                            />
                                        </div>
                                        <span className={`text-[12px] truncate ${isCurrent ? 'font-bold text-slate-900' : isDone ? 'font-medium text-slate-700' : 'text-slate-400'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[13px] text-rose-700 font-semibold">
                            Hợp đồng này đã bị hủy bỏ.
                        </div>
                    )}
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-2 border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`pb-2.5 px-3 text-[13px] font-semibold transition-colors border-b-2 cursor-pointer ${
                            activeTab === 'overview'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Thông tin & Khách hàng
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        className={`pb-2.5 px-3 text-[13px] font-semibold transition-colors border-b-2 cursor-pointer ${
                            activeTab === 'preview'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Xem trước Văn bản (A4)
                    </button>
                </div>

                {/* Tab 1: Overview */}
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5">
                            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Building2 size={17} className="text-emerald-600" />
                                    <h4 className="text-[13.5px] font-bold text-slate-900">Đối tác ký Hợp đồng</h4>
                                </div>
                                {contract.customer?.id && (
                                    <Link
                                        href={`/customers/${contract.customer.id}`}
                                        className="text-[12.5px] font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                                    >
                                        <span>Hồ sơ khách hàng</span>
                                        <ArrowRight size={13} />
                                    </Link>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[13px]">
                                <div>
                                    <span className="text-slate-400 block text-[12px] mb-0.5">Tên đối tác / Doanh nghiệp:</span>
                                    <span className="font-semibold text-slate-800 block">{contract.customer?.name || '--'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[12px] mb-0.5">Mã số thuế:</span>
                                    <span className="font-semibold text-slate-800 tabular-nums">{contract.customer?.taxCode || '--'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[12px] mb-0.5">Điện thoại:</span>
                                    <span className="font-medium text-slate-800 tabular-nums">{contract.customer?.phone || '--'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[12px] mb-0.5">Email:</span>
                                    <span className="font-medium text-slate-800 truncate block">{contract.customer?.email || '--'}</span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-slate-400 block text-[12px] mb-0.5">Địa chỉ trụ sở:</span>
                                    <span className="text-slate-700 block">{contract.customer?.address || '--'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-2.5 text-[13px]">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Mẫu biểu áp dụng:</span>
                                <span className="font-semibold text-slate-800">{contract.template?.name || 'Mặc định'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Ngày khởi tạo:</span>
                                <span className="font-medium text-slate-700 tabular-nums">{formatDate(contract.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Cập nhật lần cuối:</span>
                                <span className="font-medium text-slate-700 tabular-nums">{formatDate(contract.updatedAt)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Preview */}
                {activeTab === 'preview' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between bg-slate-100 px-3.5 py-2.5 rounded-xl text-[12.5px] text-slate-600">
                            <span>Bản xem trước A4 (chế độ đọc nhanh)</span>
                            <Link
                                href={`/contracts/${contract.id}`}
                                target="_blank"
                                className="text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1"
                            >
                                <span>Mở trang in chuẩn</span>
                                <ExternalLink size={13} />
                            </Link>
                        </div>

                        <div className="bg-slate-200/70 p-4 rounded-xl max-h-[520px] overflow-y-auto">
                            <div
                                className="bg-white p-6 sm:p-8 rounded-lg shadow-sm text-slate-800 text-[13px] font-sans leading-relaxed min-h-[400px] border border-slate-200"
                                dangerouslySetInnerHTML={{ __html: contract.content || '<p class="text-slate-400">Không có nội dung văn bản</p>' }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Drawer>
    );
}
