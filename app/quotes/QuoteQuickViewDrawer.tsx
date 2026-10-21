'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { Drawer } from '@/app/components/ui/Drawer';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { toast } from '@/app/components/providers/ToastProvider';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';
import { 
    FileText, 
    Printer, 
    FileSpreadsheet, 
    ExternalLink, 
    Copy, 
    Check, 
    Building2, 
    Phone, 
    Mail, 
    MapPin, 
    User, 
    Calendar, 
    CheckCircle2, 
    Clock, 
    ArrowRight, 
    FileBadge, 
    Edit, 
    Eye,
    ShieldCheck
} from 'lucide-react';

interface QuoteQuickViewDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    quote: any | null;
    getQuoteTotal: (quote: any) => number;
    onStatusChange: (id: string, newStatus: string) => void;
    onEdit: (quote: any) => void;
    onExportExcel: (quote: any) => void;
    canEdit: boolean;
}

const STATUS_STEPS = [
    { key: 'DRAFT', label: '1. Khởi tạo nháp' },
    { key: 'SENT', label: '2. Đã gửi khách' },
    { key: 'ACCEPTED', label: '3. Khách đã duyệt' },
    { key: 'TO_CONTRACT', label: '4. Lên hợp đồng' }
];

export function QuoteQuickViewDrawer({
    isOpen,
    onClose,
    quote,
    getQuoteTotal,
    onStatusChange,
    onEdit,
    onExportExcel,
    canEdit
}: QuoteQuickViewDrawerProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'preview'>('overview');
    const [copiedLink, setCopiedLink] = useState(false);

    if (!quote) return null;

    const totalAmount = getQuoteTotal(quote);

    // Extract subtotal and VAT if present in variables
    let subTotal = 0;
    let vatAmount = 0;
    try {
        const vars = JSON.parse(quote.variables || '{}');
        for (const [k, v] of Object.entries(vars)) {
            const kl = k.toLowerCase();
            if (typeof v === 'string') {
                const num = parseFloat(v.replace(/,/g, '')) || 0;
                if ((kl.includes('truoc_thue') || kl.includes('tam_tinh')) && !subTotal) subTotal = num;
                if ((kl.includes('vat') || kl.includes('tien_thue')) && !vatAmount) vatAmount = num;
            }
        }
    } catch (e) {}

    if (!subTotal && totalAmount) {
        subTotal = Math.round(totalAmount / 1.1);
        vatAmount = totalAmount - subTotal;
    }

    const handleCopyShareLink = () => {
        const url = `${window.location.origin}/public/quotes/${quote.id}`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        toast.success('Đã sao chép liên kết xem trước cho khách hàng', url);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    // Calculate step progress index
    let currentStepIndex = 0;
    if (quote.status === 'SENT') currentStepIndex = 1;
    if (quote.status === 'ACCEPTED') currentStepIndex = 2;
    if (quote.status === 'TO_CONTRACT') currentStepIndex = 3;
    const isFailed = quote.status === 'REJECTED' || quote.status === 'CANCELLED';

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={quote.title || 'Xem nhanh Báo giá'}
            subtitle={
                <span className="flex items-center gap-2">
                    <span>Mẫu: {quote.template?.name || 'Chuẩn'}</span>
                    <span>•</span>
                    <span>Ngày tạo: {formatDate(quote.createdAt)}</span>
                </span>
            }
            icon={FileText}
            width="xl"
            badge={
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    quote.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    quote.status === 'TO_CONTRACT' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                    quote.status === 'SENT' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    quote.status === 'REJECTED' || quote.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                    {quote.status}
                </span>
            }
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleCopyShareLink}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                            {copiedLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            <span>{copiedLink ? 'Đã chép link' : 'Copy link khách'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onExportExcel(quote)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
                        >
                            <FileSpreadsheet size={14} />
                            <span>Xuất Excel</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onEdit(quote);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
                            >
                                <Edit size={14} />
                                <span>Sửa nội dung</span>
                            </button>
                        )}
                        <Link
                            href={`/quotes/${quote.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                            <ExternalLink size={14} />
                            <span>Xem chi tiết & In</span>
                        </Link>
                    </div>
                </div>
            }
        >
            {/* Pipeline Stepper */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Tiến trình Báo giá
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Chuyển trạng thái:</span>
                        <select
                            value={quote.status}
                            onChange={(e) => onStatusChange(quote.id, e.target.value)}
                            disabled={!canEdit}
                            className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-emerald-600 shadow-2xs"
                        >
                            <option value="DRAFT">Nháp</option>
                            <option value="SENT">Đã Gửi</option>
                            <option value="ACCEPTED">Đã Duyệt</option>
                            <option value="TO_CONTRACT">Lên Hợp Đồng</option>
                            <option value="REJECTED">Từ Chối</option>
                            <option value="CANCELLED">Hủy</option>
                        </select>
                    </div>
                </div>

                {!isFailed ? (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                        {STATUS_STEPS.map((step, idx) => {
                            const isDone = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;
                            return (
                                <div key={step.key} className="flex flex-col gap-1">
                                    <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-200">
                                        <div 
                                            className={`h-full transition-all duration-300 ${
                                                isDone 
                                                    ? (idx === 3 ? 'bg-purple-600' : 'bg-emerald-500') 
                                                    : 'bg-transparent'
                                            }`} 
                                        />
                                    </div>
                                    <span className={`text-[10px] truncate ${isCurrent ? 'font-bold text-slate-900' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold flex items-center gap-2">
                        <span>Báo giá đang ở trạng thái: <strong>{quote.status === 'REJECTED' ? 'Khách từ chối' : 'Đã hủy'}</strong></span>
                    </div>
                )}
            </div>

            {/* Financial Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tạm tính (chưa VAT)
                    </span>
                    <span className="text-base font-extrabold text-slate-800 font-mono mt-0.5 block">
                        {formatMoney(subTotal)}
                    </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Thuế GTGT (VAT)
                    </span>
                    <span className="text-base font-extrabold text-slate-800 font-mono mt-0.5 block">
                        {formatMoney(vatAmount)}
                    </span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Tổng tiền sau thuế
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono mt-0.5 block">
                        {formatMoney(totalAmount)}
                    </span>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-1 border-b border-slate-200">
                <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
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
                    className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
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
                    {/* Customer Info Card */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-emerald-600" />
                                <h4 className="text-xs font-bold text-slate-900">Khách hàng nhận Báo giá</h4>
                            </div>
                            {quote.customer?.id && (
                                <Link
                                    href={`/customers/${quote.customer.id}`}
                                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                                >
                                    <span>Hồ sơ khách</span>
                                    <ArrowRight size={12} />
                                </Link>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Tên công ty:</span>
                                <span className="font-bold text-slate-800 block">{quote.customer?.name || '--'}</span>
                                {quote.customer?.shortName && (
                                    <span className="text-slate-500 text-[11px]">({quote.customer.shortName})</span>
                                )}
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Mã số thuế:</span>
                                <span className="font-mono font-bold text-slate-800">{quote.customer?.taxCode || '--'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Điện thoại:</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="font-mono font-semibold text-slate-800">{quote.customer?.phone || '--'}</span>
                                    {quote.customer?.phone && (
                                        <ClickToCallButton phoneNumber={quote.customer.phone} size="xs" />
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Email:</span>
                                <span className="font-mono text-slate-800 truncate block">{quote.customer?.email || '--'}</span>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="text-slate-400 block text-[11px]">Địa chỉ:</span>
                                <span className="text-slate-700 block">{quote.customer?.address || '--'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Card */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Mẫu báo giá áp dụng:</span>
                            <span className="font-semibold text-slate-800">{quote.template?.name || 'Mặc định'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Người tạo báo giá:</span>
                            <span className="font-semibold text-slate-800">{quote.creator?.name || 'Hệ thống'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Thời gian tạo:</span>
                            <span className="font-mono text-slate-700">{formatDate(quote.createdAt)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Lần cập nhật cuối:</span>
                            <span className="font-mono text-slate-700">{formatDate(quote.updatedAt)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Document Preview */}
            {activeTab === 'preview' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-lg text-xs text-slate-600">
                        <span>Bản xem trước A4 (chế độ đọc nhanh)</span>
                        <Link 
                            href={`/quotes/${quote.id}`} 
                            target="_blank"
                            className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                        >
                            <span>Mở trang in chuẩn</span>
                            <ExternalLink size={12} />
                        </Link>
                    </div>

                    <div className="bg-slate-200/70 p-4 rounded-xl max-h-[500px] overflow-y-auto">
                        <div 
                            className="bg-white p-6 sm:p-8 rounded-lg shadow-sm text-slate-800 text-xs font-sans leading-relaxed min-h-[400px] border border-slate-200"
                            dangerouslySetInnerHTML={{ __html: quote.content || '<p class="text-slate-400">Không có nội dung văn bản</p>' }}
                        />
                    </div>
                </div>
            )}
        </Drawer>
    );
}
