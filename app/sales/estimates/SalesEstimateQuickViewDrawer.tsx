'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Drawer } from '@/app/components/ui/Drawer';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';
import { TagDisplay } from '@/app/components/ui/TagDisplay';
import { getSalesEstimateById } from './actions';
import { 
    FileText, 
    Printer, 
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
    Edit, 
    ShoppingCart,
    Receipt,
    Target,
    AlertCircle,
    XCircle,
    FileSpreadsheet,
    FileSearch,
    Layers
} from 'lucide-react';

interface SalesEstimateQuickViewDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    estimate: any | null;
    onStatusChange: (id: string, newStatus: string) => void;
    onEdit: (estimate: any) => void;
    onCopy: (estimate: any) => void;
    onConvertToOrder?: (id: string) => void;
    onConvertToInvoice?: (id: string) => void;
    onEstimateLoaded?: (updatedEstimate: any) => void;
}

const ESTIMATE_STEPS = [
    { key: 'DRAFT', label: '1. Bản nháp' },
    { key: 'SENT', label: '2. Đã gửi' },
    { key: 'ACCEPTED', label: '3. Đã chốt' },
    { key: 'ORDERED', label: '4. Lên Đơn hàng (SO)' },
    { key: 'INVOICED', label: '5. Lên Hóa đơn (SI)' }
];

export function SalesEstimateQuickViewDrawer({
    isOpen,
    onClose,
    estimate,
    onStatusChange,
    onEdit,
    onCopy,
    onConvertToOrder,
    onConvertToInvoice,
    onEstimateLoaded
}: SalesEstimateQuickViewDrawerProps) {
    const [copiedShareLink, setCopiedShareLink] = useState(false);
    const [activeTab, setActiveTab] = useState<'items' | 'customer' | 'notes'>('items');
    const [drawerEstimate, setDrawerEstimate] = useState<any>(estimate);
    const [isLoadingItems, setIsLoadingItems] = useState(false);

    useEffect(() => {
        setDrawerEstimate(estimate);
        if (estimate?.id && (!estimate.items || (estimate.items.length === 0 && (estimate.totalAmount > 0 || estimate.subTotal > 0)))) {
            setIsLoadingItems(true);
            getSalesEstimateById(estimate.id)
                .then((res) => {
                    if (res?.success && res.data) {
                        setDrawerEstimate(res.data);
                        if (onEstimateLoaded) {
                            onEstimateLoaded(res.data);
                        }
                    }
                })
                .catch((err) => console.error("Error fetching estimate items:", err))
                .finally(() => setIsLoadingItems(false));
        }
    }, [estimate?.id]);

    const est = drawerEstimate || estimate;
    if (!est) return null;

    const handleCopyPublicUrl = () => {
        const url = `${window.location.origin}/public/sales/estimate/${est.id}`;
        navigator.clipboard.writeText(url);
        setCopiedShareLink(true);
        setTimeout(() => setCopiedShareLink(false), 2000);
    };

    // Calculate Step Index
    let currentStepIndex = 0;
    if (est.status === 'SENT') currentStepIndex = 1;
    if (est.status === 'ACCEPTED') currentStepIndex = 2;
    if (est.status === 'ORDERED') currentStepIndex = 3;
    if (est.status === 'INVOICED') currentStepIndex = 4;
    const isSpecialFailed = est.status === 'EXPIRED' || est.status === 'REJECTED';

    const customerName = est.customer?.name || est.lead?.company || est.lead?.name || 'Khách hàng vãng lai';
    const customerPhone = est.customer?.phone || est.lead?.phone;
    const customerEmail = est.customer?.email || est.lead?.email;
    const customerAddress = est.customer?.address;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={est.code || 'Chi tiết Báo Giá'}
            subtitle={
                <span className="flex items-center gap-2">
                    <span>Ngày: {formatDate(est.date)}</span>
                    {est.validUntil && (
                        <>
                            <span>•</span>
                            <span className="text-amber-600 font-medium">Hiệu lực đến: {formatDate(est.validUntil)}</span>
                        </>
                    )}
                </span>
            }
            icon={FileText}
            width="xl"
            badge={
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    est.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    est.status === 'ORDERED' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                    est.status === 'INVOICED' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                    est.status === 'SENT' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    est.status === 'EXPIRED' ? 'bg-slate-100 text-slate-700 border border-slate-300' :
                    est.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                    {est.status === 'DRAFT' ? 'Bản nháp' :
                     est.status === 'SENT' ? 'Đã gửi khách' :
                     est.status === 'ACCEPTED' ? 'Đã chốt' :
                     est.status === 'ORDERED' ? 'Đã lên Đơn hàng' :
                     est.status === 'INVOICED' ? 'Đã lên Hóa đơn' :
                     est.status === 'EXPIRED' ? 'Hết hạn' : 'Từ chối'}
                </span>
            }
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
                    {/* Left Actions: Share link & Print */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleCopyPublicUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                            {copiedShareLink ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            <span>{copiedShareLink ? 'Đã chép link' : 'Copy link khách'}</span>
                        </button>

                        <Link
                            href={`/print/sales/estimate/${est.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
                        >
                            <Printer size={14} />
                            <span>In PDF</span>
                        </Link>
                    </div>

                    {/* Right Conversions & Edit */}
                    <div className="flex items-center gap-2">
                        {onConvertToOrder && (est.status === 'DRAFT' || est.status === 'SENT' || est.status === 'ACCEPTED') && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onConvertToOrder(est.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
                            >
                                <ShoppingCart size={14} />
                                <span>Lên Đơn Hàng (SO)</span>
                            </button>
                        )}

                        {onConvertToInvoice && (est.status === 'DRAFT' || est.status === 'SENT' || est.status === 'ACCEPTED' || est.status === 'ORDERED') && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onConvertToInvoice(est.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
                            >
                                <Receipt size={14} />
                                <span>Lên Hóa Đơn (SI)</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onEdit(est);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                        >
                            <Edit size={14} />
                            <span>Sửa</span>
                        </button>

                        <Link
                            href={`/sales/estimates/${est.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                            <ExternalLink size={14} />
                            <span>Chi tiết đầy đủ</span>
                        </Link>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* 1. Pipeline Stepper */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/90 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Tiến trình Xử lý Báo giá
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 font-medium">Chuyển trạng thái:</span>
                            <select
                                value={est.status}
                                onChange={(e) => onStatusChange(est.id, e.target.value)}
                                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-emerald-600 shadow-2xs cursor-pointer"
                            >
                                <option value="DRAFT">1. Bản nháp</option>
                                <option value="SENT">2. Đã gửi khách</option>
                                <option value="ACCEPTED">3. Đã chốt</option>
                                <option value="ORDERED">4. Đã lên Đơn hàng (SO)</option>
                                <option value="INVOICED">5. Đã lên Hóa đơn (SI)</option>
                                <option value="EXPIRED">Hết hạn hiệu lực</option>
                                <option value="REJECTED">Từ chối / Hủy</option>
                            </select>
                        </div>
                    </div>

                    {!isSpecialFailed ? (
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                            {ESTIMATE_STEPS.map((step, idx) => {
                                const isDone = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;
                                return (
                                    <div key={step.key} className="flex flex-col gap-1">
                                        <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-200">
                                            <div 
                                                className={`h-full transition-all duration-300 ${
                                                    isDone 
                                                        ? (idx >= 3 ? 'bg-indigo-600' : 'bg-emerald-500') 
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
                            <AlertCircle size={14} className="text-rose-600 shrink-0" />
                            <span>Báo giá đang ở trạng thái: <strong>{est.status === 'EXPIRED' ? 'Hết hạn hiệu lực' : 'Đã từ chối / Hủy'}</strong></span>
                        </div>
                    )}
                </div>

                {/* 2. Financial Highlights Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tiền hàng (chưa thuế)
                        </span>
                        <span className="text-base font-extrabold text-slate-800 font-mono mt-0.5 block">
                            {formatMoney(est.subTotal || 0)}
                        </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Thuế GTGT (VAT)
                        </span>
                        <span className="text-base font-extrabold text-slate-800 font-mono mt-0.5 block">
                            {formatMoney(est.taxAmount || 0)}
                        </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                            Tổng cộng báo giá
                        </span>
                        <span className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-0.5 block">
                            {formatMoney(est.totalAmount || 0)}
                        </span>
                    </div>
                </div>

                {/* 3. Navigation Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab('items')}
                        className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'items'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Layers size={14} />
                        <span>Sản phẩm & Dịch vụ ({isLoadingItems ? '...' : (est.items?.length || 0)})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('customer')}
                        className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'customer'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Building2 size={14} />
                        <span>Khách hàng & Cơ hội</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('notes')}
                        className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                            activeTab === 'notes'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FileText size={14} />
                        <span>Ghi chú & Thẻ</span>
                    </button>
                </div>

                {/* Tab 1: Line Items Table */}
                {activeTab === 'items' && (
                    <div className="space-y-3">
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                                        <th className="py-2.5 px-3">Sản phẩm / Dịch vụ</th>
                                        <th className="py-2.5 px-2.5 w-16 text-center">ĐVT</th>
                                        <th className="py-2.5 px-2.5 w-16 text-right">SL</th>
                                        <th className="py-2.5 px-3 text-right">Đơn giá</th>
                                        <th className="py-2.5 px-2 w-16 text-center">VAT</th>
                                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoadingItems ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                    <span>Đang tải danh sách sản phẩm...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : est.items && est.items.length > 0 ? (
                                        est.items.map((item: any, idx: number) => (
                                            <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                                                    {idx + 1}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="font-semibold text-slate-800 block">
                                                        {item.product?.name || item.customName || item.productName || 'Sản phẩm'}
                                                    </span>
                                                    {item.description && (
                                                        <span className="text-[11px] text-slate-400 line-clamp-1 block mt-0.5">
                                                            {item.description}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-2.5 text-center text-slate-600 font-medium">
                                                    {item.product?.unit || item.unit || '--'}
                                                </td>
                                                <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-800">
                                                    {item.quantity}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                                    {formatMoney(item.unitPrice)}
                                                </td>
                                                <td className="py-2.5 px-2 text-center text-slate-500 font-mono">
                                                    {item.taxRate ? `${item.taxRate}%` : '0%'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                                    {formatMoney(item.totalPrice)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                                                Chưa có dòng sản phẩm nào trong báo giá này
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab 2: Customer & Lead Details */}
                {activeTab === 'customer' && (
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Building2 size={16} className="text-emerald-600" />
                                    <h4 className="text-xs font-bold text-slate-900">Thông tin Khách hàng / Doanh nghiệp</h4>
                                </div>
                                {est.customerId && (
                                    <Link
                                        href={`/customers/${est.customerId}`}
                                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                                    >
                                        <span>Xem hồ sơ</span>
                                        <ArrowRight size={12} />
                                    </Link>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Tên khách hàng:</span>
                                    <span className="font-bold text-slate-800 block text-sm">{customerName}</span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="font-mono font-bold text-slate-800">{customerPhone || '--'}</span>
                                        {customerPhone && (
                                            <ClickToCallButton phoneNumber={customerPhone} size="xs" />
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-slate-400 block text-[11px]">Email liên hệ:</span>
                                    <span className="font-mono text-slate-800 block">{customerEmail || '--'}</span>
                                </div>

                                <div>
                                    <span className="text-slate-400 block text-[11px]">Nhân viên phụ trách:</span>
                                    <span className="font-semibold text-slate-800 block">
                                        {est.salesperson?.name || est.creator?.name || 'Chưa phân công'}
                                    </span>
                                </div>

                                {customerAddress && (
                                    <div className="sm:col-span-2">
                                        <span className="text-slate-400 block text-[11px]">Địa chỉ:</span>
                                        <span className="text-slate-700 block">{customerAddress}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Associated Lead Card */}
                        {est.lead && (
                            <div className="bg-indigo-50/50 rounded-xl border border-indigo-200/70 p-3.5 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Target size={15} className="text-indigo-600" />
                                        <span className="font-bold text-indigo-900">Liên kết Cơ hội bán hàng (Lead)</span>
                                    </div>
                                    <Link
                                        href={`/sales/leads/${est.lead.id}`}
                                        className="text-[11px] font-bold text-indigo-700 hover:underline inline-flex items-center gap-1"
                                    >
                                        <span>Chi tiết cơ hội</span>
                                        <ArrowRight size={12} />
                                    </Link>
                                </div>
                                <div className="text-slate-700">
                                    Mã cơ hội: <strong className="font-mono text-indigo-900">{est.lead.code}</strong> - {est.lead.name}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 3: Notes & Tags */}
                {activeTab === 'notes' && (
                    <div className="space-y-3">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                Thẻ phân loại (Tags)
                            </span>
                            {est.tags ? (
                                <TagDisplay tagsString={est.tags} />
                            ) : (
                                <span className="text-slate-400 text-xs italic">Chưa gắn thẻ</span>
                            )}
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                Ghi chú / Điều khoản báo giá
                            </span>
                            {est.notes ? (
                                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-200/60 font-sans">
                                    {est.notes}
                                </div>
                            ) : (
                                <span className="text-slate-400 text-xs italic">Không có ghi chú</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Drawer>
    );
}
