'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { Drawer } from '@/app/components/ui/Drawer';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';
import { toast } from '@/app/components/providers/ToastProvider';
import { 
    Building2, 
    Phone, 
    Mail, 
    MapPin, 
    Globe, 
    CreditCard, 
    FileText, 
    FileBadge, 
    ShoppingCart, 
    Receipt, 
    ArrowRight, 
    Copy, 
    Check, 
    Edit, 
    Clock, 
    ShieldCheck, 
    AlertTriangle,
    Plus,
    UserCheck,
    Briefcase
} from 'lucide-react';

interface CustomerQuickViewDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    customer: any | null;
    onEdit: (customer: any) => void;
    canEdit: boolean;
    getAvatarStyle: (id: string) => { background: string };
    getInitials: (name: string) => string;
}

export function CustomerQuickViewDrawer({
    isOpen,
    onClose,
    customer,
    onEdit,
    canEdit,
    getAvatarStyle,
    getInitials
}: CustomerQuickViewDrawerProps) {
    const [activeTab, setActiveTab] = useState<'contact' | 'bank' | 'notes'>('contact');
    const [copiedTax, setCopiedTax] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    if (!customer) return null;

    const initials = getInitials(customer.name || '');
    const avatarStyle = getAvatarStyle(customer.id || '');
    const debt = Number(customer.totalDebt) || 0;
    const revenue = Number(customer.revenue) || 0;
    const limit = Number(customer.creditLimit) || 0;
    const isDebt = debt > 0;
    const isOverLimit = limit > 0 && debt > limit;

    const handleCopy = (text: string, type: 'tax' | 'code') => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        if (type === 'tax') {
            setCopiedTax(true);
            toast.success('Đã sao chép Mã số thuế', text);
            setTimeout(() => setCopiedTax(false), 2000);
        } else {
            setCopiedCode(true);
            toast.success('Đã sao chép Mã khách hàng', text);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={customer.name || 'Xem nhanh Khách hàng'}
            subtitle={
                <span className="flex items-center gap-2">
                    <span>Mã: {customer.code || '--'}</span>
                    {customer.shortName && (
                        <>
                            <span>•</span>
                            <span>({customer.shortName})</span>
                        </>
                    )}
                </span>
            }
            icon={Building2}
            width="xl"
            badge={
                <div className="flex items-center gap-1.5">
                    {isOverLimit ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                            Vượt hạn mức
                        </span>
                    ) : isDebt ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                            Có công nợ
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Công nợ tốt
                        </span>
                    )}
                </div>
            }
            footer={
                <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onEdit(customer);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                            >
                                <Edit size={14} />
                                <span>Chỉnh sửa thông tin</span>
                            </button>
                        )}
                        <Link
                            href={`/quotes/new?customerId=${customer.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
                        >
                            <Plus size={14} />
                            <span>Tạo Báo Giá Mới</span>
                        </Link>
                    </div>

                    <Link
                        href={`/customers/${customer.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs"
                    >
                        <span>Xem chi tiết hồ sơ 360°</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>
            }
        >
            {/* Customer Hero Profile Header */}
            <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div 
                        style={avatarStyle} 
                        className="w-14 h-14 rounded-2xl text-white font-extrabold text-base flex items-center justify-center shadow-sm shrink-0 font-mono"
                    >
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span 
                                onClick={() => handleCopy(customer.code || '', 'code')}
                                className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                title="Click để chép mã"
                            >
                                {customer.code || 'NO-CODE'}
                                {copiedCode && <Check size={11} className="text-emerald-600" />}
                            </span>
                            {customer.taxCode && (
                                <span 
                                    onClick={() => handleCopy(customer.taxCode || '', 'tax')}
                                    className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                    title="Click để chép MST"
                                >
                                    MST: {customer.taxCode}
                                    {copiedTax && <Check size={11} className="text-emerald-600" />}
                                </span>
                            )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1 truncate">
                            {customer.name}
                        </h3>
                        {customer.contactName && (
                            <p className="text-xs text-slate-500 mt-0.5">
                                Người liên hệ: <strong className="text-slate-700">{customer.contactName}</strong>
                            </p>
                        )}
                    </div>
                </div>

                {/* Quick Call & Email Strip */}
                <div className="flex items-center gap-2 shrink-0">
                    {customer.phone && (
                        <ClickToCallButton 
                            phoneNumber={customer.phone} 
                            showText={true} 
                            label="Gọi điện" 
                            size="sm" 
                            className="h-[34px] px-3 font-bold"
                        />
                    )}
                    {customer.email && (
                        <a
                            href={`mailto:${customer.email}`}
                            className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                            <Mail size={14} />
                            <span>Gửi Mail</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Financial & CRM Key Figures */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Doanh thu tích lũy
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-indigo-700 font-mono mt-0.5 block">
                        {formatMoney(revenue)}
                    </span>
                </div>
                <div className={`p-3.5 rounded-xl border shadow-2xs ${isDebt ? 'bg-rose-50/80 border-rose-200' : 'bg-white border-slate-200'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDebt ? 'text-rose-700' : 'text-slate-400'}`}>
                        Công nợ hiện tại
                    </span>
                    <span className={`text-sm sm:text-base font-extrabold font-mono mt-0.5 block ${isDebt ? 'text-rose-600' : 'text-slate-800'}`}>
                        {formatMoney(debt)}
                    </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Hạn mức tín dụng
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-800 font-mono mt-0.5 block">
                        {formatMoney(limit)}
                    </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Hồ sơ giao dịch
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-slate-700">
                        <span title="Số báo giá">📄 {customer._count?.quotes || 0}</span>
                        <span>•</span>
                        <span title="Số hợp đồng">📑 {customer._count?.contracts || 0}</span>
                        <span>•</span>
                        <span title="Số hóa đơn">🧾 {customer._count?.salesInvoices || 0}</span>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-1 border-b border-slate-200">
                <button
                    type="button"
                    onClick={() => setActiveTab('contact')}
                    className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                        activeTab === 'contact'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    Thông tin liên hệ & Pháp lý
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('bank')}
                    className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                        activeTab === 'bank'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    Tài khoản & Điều khoản
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                        activeTab === 'notes'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    Ghi chú & Lịch sử
                </button>
            </div>

            {/* Tab 1: Legal & Contact */}
            {activeTab === 'contact' && (
                <div className="space-y-3 text-xs">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Tên đầy đủ:</span>
                                <span className="font-bold text-slate-800 block">{customer.name}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Tên quốc tế (nếu có):</span>
                                <span className="text-slate-700 block">{customer.internationalName || '--'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="font-mono font-semibold text-slate-800">{customer.phone || '--'}</span>
                                    {customer.phone && <ClickToCallButton phoneNumber={customer.phone} size="xs" />}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Email liên hệ:</span>
                                <span className="font-mono text-slate-800 truncate block">{customer.email || '--'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Loại hình doanh nghiệp:</span>
                                <span className="text-slate-700 block">{customer.businessType || '--'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Website:</span>
                                {customer.website ? (
                                    <a
                                        href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-mono"
                                    >
                                        <span>{customer.website}</span>
                                        <Globe size={11} />
                                    </a>
                                ) : (
                                    <span className="text-slate-400">--</span>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 space-y-2">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Địa chỉ trụ sở / kinh doanh:</span>
                                <span className="text-slate-800 block">{customer.address || '--'}</span>
                            </div>
                            {customer.billingAddress && (
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Địa chỉ xuất hóa đơn:</span>
                                    <span className="text-slate-700 block">{customer.billingAddress}</span>
                                </div>
                            )}
                            {customer.shippingAddress && (
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Địa chỉ giao hàng:</span>
                                    <span className="text-slate-700 block">{customer.shippingAddress}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Bank & Terms */}
            {activeTab === 'bank' && (
                <div className="space-y-3 text-xs">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <CreditCard size={16} className="text-emerald-600" />
                            <h4 className="text-xs font-bold text-slate-900">Thông tin Ngân hàng Đối tác</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Số tài khoản:</span>
                                <span className="font-mono font-bold text-slate-900 text-sm">{customer.bankAccount || '--'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Ngân hàng:</span>
                                <span className="font-semibold text-slate-800">{customer.bankName || '--'}</span>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="text-slate-400 block text-[11px]">Chi nhánh:</span>
                                <span className="text-slate-700">{customer.bankBranch || '--'}</span>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                            <span className="text-slate-400 block text-[11px]">Điều khoản thanh toán & công nợ:</span>
                            <p className="text-slate-800 font-semibold mt-0.5">{customer.paymentTerms || 'Thanh toán theo hợp đồng tiêu chuẩn'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 3: Notes & History */}
            {activeTab === 'notes' && (
                <div className="space-y-3 text-xs">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                        <div>
                            <span className="text-slate-400 block text-[11px]">Ghi chú nội bộ:</span>
                            <div className="mt-1 p-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 whitespace-pre-wrap min-h-[60px]">
                                {customer.internalNotes || 'Chưa có ghi chú nội bộ cho khách hàng này.'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-500">
                            <div>
                                <span>Ngày khởi tạo: </span>
                                <strong className="text-slate-700 font-mono">{formatDate(customer.createdAt)}</strong>
                            </div>
                            <div>
                                <span>Tương tác cuối: </span>
                                <strong className="text-slate-700 font-mono">{customer.lastActivityAt ? formatDate(customer.lastActivityAt) : 'Mới tạo'}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
