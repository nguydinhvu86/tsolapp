'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { Drawer } from '@/app/components/ui/Drawer';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';
import { TagDisplay } from '@/app/components/ui/TagDisplay';
import { 
    Receipt, 
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
    FileText, 
    Edit, 
    ShoppingCart,
    PackageCheck,
    AlertCircle,
    XCircle,
    BadgePercent
} from 'lucide-react';

interface SalesInvoiceQuickViewDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any | null;
    onStatusChange: (id: string, newStatus: string) => void;
    onApprove: (id: string) => void;
    onEdit: (invoice: any) => void;
    onCopy: (invoice: any) => void;
    canEdit?: boolean;
}

const INVOICE_STEPS = [
    { key: 'DRAFT', label: '1. Khởi tạo nháp' },
    { key: 'ISSUED', label: '2. Đã phát hành / Ghi nợ' },
    { key: 'PARTIAL_PAID', label: '3. Thu nợ 1 phần' },
    { key: 'PAID', label: '4. Đã thu đủ 100%' }
];

export function SalesInvoiceQuickViewDrawer({
    isOpen,
    onClose,
    invoice,
    onStatusChange,
    onApprove,
    onEdit,
    onCopy,
    canEdit = true
}: SalesInvoiceQuickViewDrawerProps) {
    const [activeTab, setActiveTab] = useState<'items' | 'customer' | 'notes'>('items');

    if (!invoice) return null;

    const remainingDebt = Math.max(0, (Number(invoice.totalAmount) || 0) - (Number(invoice.paidAmount) || 0));
    const isCancelled = invoice.status === 'CANCELLED';

    // Calculate step progress
    let currentStepIndex = 0;
    if (invoice.status === 'ISSUED') currentStepIndex = 1;
    if (invoice.status === 'PARTIAL_PAID') currentStepIndex = 2;
    if (invoice.status === 'PAID') currentStepIndex = 3;

    // Check overdue
    const isOverdue = invoice.dueDate && new Date(invoice.dueDate).getTime() < new Date().getTime() && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={
                <span className="flex items-center gap-2">
                    <span className="font-mono text-emerald-700">{invoice.code}</span>
                    <span className="text-slate-400 font-normal">|</span>
                    <span className="truncate">{invoice.customer?.name || 'Khách hàng'}</span>
                </span>
            }
            subtitle={
                <span className="flex items-center gap-2 text-xs">
                    <span>Ngày lập: {formatDate(invoice.date)}</span>
                    {invoice.dueDate && (
                        <>
                            <span>•</span>
                            <span className={isOverdue ? 'text-rose-600 font-semibold' : ''}>
                                Hạn thanh toán: {formatDate(invoice.dueDate)} {isOverdue && '(Quá hạn)'}
                            </span>
                        </>
                    )}
                </span>
            }
            icon={Receipt}
            width="xl"
            badge={
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    invoice.status === 'PARTIAL_PAID' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    invoice.status === 'ISSUED' ? (isOverdue ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800 border border-amber-300') :
                    invoice.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                    {invoice.status === 'PAID' ? 'Đã thanh toán đủ' :
                     invoice.status === 'PARTIAL_PAID' ? 'Thu nợ một phần' :
                     invoice.status === 'ISSUED' ? (isOverdue ? 'Quá hạn thu' : 'Đã phát hành') :
                     invoice.status === 'CANCELLED' ? 'Đã hủy' : 'Bản nháp'}
                </span>
            }
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-1.5">
                        {invoice.status === 'DRAFT' && (
                            <button
                                type="button"
                                onClick={() => {
                                    onApprove(invoice.id);
                                    onClose();
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                            >
                                <CheckCircle2 size={14} />
                                <span>Duyệt & Xuất Kho</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                onCopy(invoice);
                                onClose();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                        >
                            <Copy size={13} />
                            <span>Sao chép</span>
                        </button>
                        <Link
                            href={`/print/sales/invoice/${invoice.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
                        >
                            <Printer size={13} />
                            <span>In phiếu / PDF</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        {invoice.status !== 'CANCELLED' && canEdit && (
                            <button
                                type="button"
                                onClick={() => {
                                    onEdit(invoice);
                                    onClose();
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                            >
                                <Edit size={13} />
                                <span>{invoice.status === 'DRAFT' ? 'Chỉnh sửa' : 'Điều chỉnh'}</span>
                            </button>
                        )}
                        <Link
                            href={`/sales/invoices/${invoice.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-2xs"
                        >
                            <ExternalLink size={14} />
                            <span>Xem chi tiết hồ sơ</span>
                        </Link>
                    </div>
                </div>
            }
        >
            {/* Stepper Process */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Tiến trình Hóa Đơn & Thu Nợ
                    </span>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Chuyển trạng thái:</span>
                        <select
                            value={invoice.status}
                            onChange={(e) => onStatusChange(invoice.id, e.target.value)}
                            disabled={!canEdit || invoice.status === 'CANCELLED'}
                            className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-emerald-600 shadow-2xs cursor-pointer"
                        >
                            <option value="DRAFT">Bản nháp</option>
                            <option value="ISSUED">Đã phát hành / Ghi nợ</option>
                            <option value="PARTIAL_PAID">Thanh toán 1 phần</option>
                            <option value="PAID">Đã thanh toán đủ</option>
                            {invoice.status === 'CANCELLED' && <option value="CANCELLED">Đã hủy</option>}
                        </select>
                    </div>
                </div>

                {!isCancelled ? (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                        {INVOICE_STEPS.map((step, idx) => {
                            const isDone = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;
                            return (
                                <div key={step.key} className="flex flex-col gap-1">
                                    <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-200">
                                        <div 
                                            className={`h-full transition-all duration-300 ${
                                                isDone 
                                                    ? (idx === 3 ? 'bg-emerald-500' : 'bg-indigo-600') 
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
                        <XCircle size={14} />
                        <span>Hóa đơn này đã bị hủy bỏ (không phát sinh công nợ).</span>
                    </div>
                )}
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tiền hàng trước thuế
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-800 font-mono mt-0.5 block">
                        {formatMoney(invoice.subTotal)}
                    </span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tiền thuế VAT
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-800 font-mono mt-0.5 block">
                        {formatMoney(invoice.taxAmount)}
                    </span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                        Tổng thanh toán
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-indigo-700 font-mono mt-0.5 block">
                        {formatMoney(invoice.totalAmount)}
                    </span>
                </div>
                <div className={`p-3 rounded-xl border shadow-2xs ${remainingDebt > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-emerald-50/80 border-emerald-200'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${remainingDebt > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {remainingDebt > 0 ? 'Còn nợ lại' : 'Đã thu đủ 100%'}
                    </span>
                    <span className={`text-sm sm:text-base font-extrabold font-mono mt-0.5 block ${remainingDebt > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatMoney(remainingDebt)}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200">
                <button
                    type="button"
                    onClick={() => setActiveTab('items')}
                    className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                        activeTab === 'items'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    Chi tiết Hàng hóa ({invoice.items?.length || 0})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('customer')}
                    className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                        activeTab === 'customer'
                            ? 'border-emerald-600 text-emerald-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    Khách hàng & Người lập
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
                    Ghi chú & Thẻ Tags
                </button>
            </div>

            {/* Tab 1: Line Items Table */}
            {activeTab === 'items' && (
                <div className="space-y-3">
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                                    <th className="py-2.5 px-3">Tên sản phẩm / Dịch vụ</th>
                                    <th className="py-2.5 px-2 text-center w-16">ĐVT</th>
                                    <th className="py-2.5 px-2 text-center w-16">SL</th>
                                    <th className="py-2.5 px-3 text-right w-24">Đơn giá</th>
                                    <th className="py-2.5 px-2 text-center w-14">VAT</th>
                                    <th className="py-2.5 px-3 text-right w-28">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(!invoice.items || invoice.items.length === 0) ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                            Không có danh sách hàng hóa
                                        </td>
                                    </tr>
                                ) : (
                                    invoice.items.map((item: any, idx: number) => {
                                        const prodName = item.product?.name || item.customName || item.productName || 'Sản phẩm';
                                        return (
                                            <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className="font-semibold text-slate-900 block">{prodName}</span>
                                                    {item.description && (
                                                        <span className="text-[11px] text-slate-500 block">{item.description}</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-2 text-center text-slate-600">{item.product?.unit || item.unit || '--'}</td>
                                                <td className="py-2.5 px-2 text-center font-bold text-slate-800 font-mono">{item.quantity}</td>
                                                <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatMoney(item.unitPrice)}</td>
                                                <td className="py-2.5 px-2 text-center text-[11px] font-mono font-semibold text-slate-500">
                                                    {item.taxRate !== undefined && item.taxRate !== null ? `${item.taxRate}%` : '0%'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatMoney(item.totalPrice)}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Customer & Info */}
            {activeTab === 'customer' && (
                <div className="space-y-3 text-xs">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-emerald-600" />
                                <h4 className="text-xs font-bold text-slate-900">Thông tin Khách hàng</h4>
                            </div>
                            {invoice.customer?.id && (
                                <Link
                                    href={`/customers/${invoice.customer.id}`}
                                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                                >
                                    <span>Hồ sơ khách 360°</span>
                                    <ArrowRight size={12} />
                                </Link>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Tên khách hàng:</span>
                                <span className="font-bold text-slate-800 block">{invoice.customer?.name || '--'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Mã số thuế:</span>
                                <span className="font-mono font-bold text-slate-800">{invoice.customer?.taxCode || '--'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="font-mono font-semibold text-slate-800">{invoice.customer?.phone || '--'}</span>
                                    {invoice.customer?.phone && (
                                        <ClickToCallButton phoneNumber={invoice.customer.phone} size="xs" />
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Email:</span>
                                <span className="font-mono text-slate-800 truncate block">{invoice.customer?.email || '--'}</span>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="text-slate-400 block text-[11px]">Địa chỉ:</span>
                                <span className="text-slate-700 block">{invoice.customer?.address || '--'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Đơn hàng gốc (Sales Order):</span>
                            {invoice.order?.code ? (
                                <Link
                                    href={`/sales/orders/${invoice.orderId}`}
                                    className="font-mono font-bold text-indigo-600 hover:underline"
                                >
                                    {invoice.order.code}
                                </Link>
                            ) : (
                                <span className="text-slate-400">Không liên kết đơn hàng</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Nhân viên phụ trách:</span>
                            <span className="font-semibold text-slate-800">{invoice.salesperson?.name || invoice.creator?.name || 'Hệ thống'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Người tạo:</span>
                            <span className="font-semibold text-slate-800">{invoice.creator?.name || 'Hệ thống'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 3: Notes & Tags */}
            {activeTab === 'notes' && (
                <div className="space-y-3 text-xs">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                        <div>
                            <span className="text-slate-400 block text-[11px]">Ghi chú hóa đơn:</span>
                            <p className="mt-1 p-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 whitespace-pre-wrap min-h-[60px]">
                                {invoice.notes || 'Không có ghi chú.'}
                            </p>
                        </div>
                        {invoice.tags && (
                            <div>
                                <span className="text-slate-400 block text-[11px] mb-1">Thẻ phân loại (Tags):</span>
                                <TagDisplay tagsString={invoice.tags} />
                            </div>
                        )}
                        <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-500">
                            <span>Ngày tạo: <strong className="font-mono text-slate-700">{formatDate(invoice.createdAt)}</strong></span>
                            <span>Cập nhật: <strong className="font-mono text-slate-700">{formatDate(invoice.updatedAt)}</strong></span>
                        </div>
                    </div>
                </div>
            )}
        </Drawer>
    );
}
