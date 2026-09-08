'use client';
import { formatDate, formatMoney } from '@/lib/utils/formatters';
import { TaxBadge } from '@/app/components/ui/TaxRateSelect';
import { StatusBadge } from '@/app/components/ui/StatusBadge';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, ShoppingCart, CheckSquare, Building, FileDown, Plus, ExternalLink, Copy, Mail, User } from 'lucide-react';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { sendPurchaseOrderEmail } from '../../actions';
import Link from 'next/link';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';

export function PurchaseOrderDetailClient({ order, tasks, users, emailTemplates = [] }: { order: any, tasks: any[], users: any[], emailTemplates?: any[] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'items' | 'bills' | 'tasks'>('items');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Pagination hooks
    const itemsPag = usePagination(order.items || []);
    const billsPag = usePagination(order.bills || []);

    const handleCopyPublicLink = () => {
        const publicUrl = `${window.location.origin}/public/purchasing/orders/${order.id}`;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const tabs = [
        { id: 'items', label: 'Chi tiết sản phẩm', icon: <ShoppingCart size={16} />, count: order.items?.length || 0 },
        { id: 'bills', label: 'Hóa đơn & Nhập kho', icon: <FileDown size={16} />, count: order.bills?.length || 0 },
        { id: 'tasks', label: 'Công việc liên quan', icon: <CheckSquare size={16} />, count: tasks.length },
    ] as const;

    return (
        <div className="space-y-6">
            {/* Header & Action Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shadow-xs"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                                Đơn Đặt Hàng <span className="font-mono text-slate-700">{order.code}</span>
                            </h1>
                            <StatusBadge status={order.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Quản lý chi tiết mua hàng, theo dõi nhập kho và công việc liên kết.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/80 shadow-xs transition-colors"
                    >
                        <Mail size={14} className="text-emerald-700" />
                        Gửi Email NCC
                    </button>
                    <button
                        onClick={handleCopyPublicLink}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
                    >
                        <Copy size={14} className="text-slate-500" />
                        {copied ? 'Đã sao chép' : 'Copy Link Gửi KH'}
                    </button>
                    <Link
                        href={`/public/purchasing/orders/${order.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-200 bg-sky-50/50 text-xs font-semibold text-sky-700 hover:bg-sky-100/60 shadow-xs transition-colors"
                    >
                        <ExternalLink size={14} />
                        Xem Bản In
                    </Link>
                    <Link
                        href={`/purchasing/bills?orderId=${order.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--primary)] text-xs font-semibold text-white hover:opacity-90 shadow-xs transition-all"
                    >
                        <Plus size={14} />
                        Nhập kho (Hóa Đơn)
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details & Tabs */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Summary Card */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
                        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                            <FileText size={16} className="text-[var(--primary)]" />
                            <h2 className="text-sm font-semibold text-slate-900">Thông tin chung</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nhà Cung Cấp</p>
                                <div className="flex items-center gap-1.5">
                                    <Building size={14} className="text-slate-400 shrink-0" />
                                    <Link href={`/suppliers/${order.supplierId}`} className="font-semibold text-xs text-slate-800 hover:text-[var(--primary)] truncate">
                                        {order.supplier?.name}
                                    </Link>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Ngày Đặt Hàng</p>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                    <Calendar size={14} className="text-slate-400 shrink-0" />
                                    {formatDate(order.date)}
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Nhân Viên Phụ Trách</p>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                    <User size={14} className="text-slate-400 shrink-0" />
                                    {order.creator?.name || '---'}
                                </div>
                            </div>
                            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">Tổng Giá Trị</p>
                                <p className="font-bold text-sm text-[var(--primary)] tracking-tight font-mono">{formatMoney(order.totalAmount)}</p>
                            </div>
                            {order.notes && (
                                <div className="col-span-full p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Ghi Chú</p>
                                    <p className="text-xs text-slate-600 leading-relaxed">{order.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs Area */}
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="flex border-b border-slate-100 bg-slate-50/50 px-4 pt-2">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                                            isActive
                                                ? 'border-[var(--primary)] text-[var(--primary)] bg-white rounded-t-lg shadow-2xs'
                                                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            isActive ? 'bg-emerald-50 text-[var(--primary)]' : 'bg-slate-200/60 text-slate-600'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-5">
                            {activeTab === 'items' && (
                                <div className="overflow-x-auto w-full rounded-lg border border-slate-100">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                                                <th className="py-2.5 px-3.5 font-semibold">Sản Phẩm</th>
                                                <th className="py-2.5 px-3.5 font-semibold text-center">Số Lượng</th>
                                                <th className="py-2.5 px-3.5 font-semibold text-right">Đơn Giá</th>
                                                <th className="py-2.5 px-3.5 font-semibold text-center">Thuế</th>
                                                <th className="py-2.5 px-3.5 font-semibold text-right">Thành Tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {itemsPag.paginatedItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-8 text-slate-400 italic">
                                                        Chưa có sản phẩm nào trong đơn đặt hàng.
                                                    </td>
                                                </tr>
                                            ) : (
                                                itemsPag.paginatedItems.map((item: any) => (
                                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="py-3 px-3.5 font-medium text-slate-800">
                                                            <div className="font-semibold">{item.product?.name || item.productName || 'Sản phẩm không xác định'}</div>
                                                            {item.product?.sku && <div className="text-[11px] font-mono text-slate-400 mt-0.5">SKU: {item.product.sku}</div>}
                                                        </td>
                                                        <td className="py-3 px-3.5 text-center text-slate-600 font-medium">
                                                            {item.quantity} {item.product?.unit || ''}
                                                        </td>
                                                        <td className="py-3 px-3.5 text-right font-mono text-slate-700">
                                                            {formatMoney(item.unitPrice)}
                                                        </td>
                                                        <td className="py-3 px-3.5 text-center">
                                                            <TaxBadge rate={item.taxRate} />
                                                        </td>
                                                        <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-900">
                                                            {formatMoney(item.totalPrice)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                            {order.items?.length > 0 && (
                                                <>
                                                    <tr className="bg-slate-50/40 border-t border-slate-200">
                                                        <td colSpan={4} className="py-2.5 px-3.5 text-right text-slate-500 font-medium">Tiền trước thuế:</td>
                                                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-slate-800">{formatMoney(order.subTotal || 0)}</td>
                                                    </tr>
                                                    <tr className="bg-slate-50/40">
                                                        <td colSpan={4} className="py-2.5 px-3.5 text-right text-slate-500 font-medium">Tiền thuế:</td>
                                                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-slate-800">{formatMoney(order.taxAmount || 0)}</td>
                                                    </tr>
                                                    <tr className="bg-emerald-50/30 border-t border-slate-200">
                                                        <td colSpan={4} className="py-3 px-3.5 text-right font-bold text-slate-900">Tổng Cộng:</td>
                                                        <td className="py-3 px-3.5 text-right font-mono font-bold text-[var(--primary)] text-sm">{formatMoney(order.totalAmount)}</td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                    <div className="p-3 border-t border-slate-100">
                                        <Pagination {...itemsPag.paginationProps} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'bills' && (
                                <div>
                                    <div className="mb-3">
                                        <p className="text-xs text-slate-500">Các hóa đơn mua hàng (nhập kho) được xuất ra từ đơn đặt hàng này.</p>
                                    </div>
                                    <div className="overflow-x-auto w-full rounded-lg border border-slate-100">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
                                                    <th className="py-2.5 px-3.5 font-semibold">Mã Hệ Thống</th>
                                                    <th className="py-2.5 px-3.5 font-semibold">Số HĐ (NCC)</th>
                                                    <th className="py-2.5 px-3.5 font-semibold">Trạng Thái</th>
                                                    <th className="py-2.5 px-3.5 font-semibold text-right">Giá Trị HĐ</th>
                                                    <th className="py-2.5 px-3.5 font-semibold text-right">Chi Tiết</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {billsPag.paginatedItems.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-8 text-slate-400 italic">
                                                            Chưa có Hóa đơn / Phiếu nhập kho nào được tạo.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    billsPag.paginatedItems.map((bill: any) => (
                                                        <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="py-3 px-3.5 font-semibold font-mono text-slate-800">{bill.code}</td>
                                                            <td className="py-3 px-3.5 text-slate-600 font-mono">{bill.supplierInvoice || '--'}</td>
                                                            <td className="py-3 px-3.5">
                                                                <StatusBadge status={bill.status} />
                                                            </td>
                                                            <td className="py-3 px-3.5 text-right font-mono font-semibold text-slate-900">{formatMoney(bill.totalAmount)}</td>
                                                            <td className="py-3 px-3.5 text-right">
                                                                <Link href={`/purchasing/bills/${bill.id}`} className="text-[var(--primary)] hover:underline font-semibold">
                                                                    Chi tiết →
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                        <div className="p-3 border-t border-slate-100">
                                            <Pagination {...billsPag.paginationProps} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'tasks' && (
                                <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 bg-slate-50/50">
                                    Vui lòng theo dõi và cập nhật công việc ở cột bên phải.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Tasks Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="sticky top-20">
                        <TaskPanel
                            initialTasks={tasks}
                            users={users}
                            entityType="PURCHASE_ORDER"
                            entityId={order.id}
                        />
                    </div>
                </div>
            </div>

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                templates={emailTemplates}
                moduleType="PURCHASE_ORDER"
                variablesData={{
                    orderCode: order.code,
                    supplierName: order.supplier?.name || '',
                    totalAmount: formatMoney(order.totalAmount),
                    date: formatDate(order.date),
                    notes: order.notes || '',
                    link: typeof window !== 'undefined' ? `${window.location.origin}/public/purchasing/orders/${order.id}` : ''
                }}
                onSend={async (emailData: any) => {
                    const res = await sendPurchaseOrderEmail(order.id, emailData.to, emailData.subject, emailData.htmlBody);
                    if (res?.success) alert("Đã gửi email đơn mua hàng thành công!");
                    else alert("Lỗi khi gửi email: " + res?.error);
                }}
            />
        </div>
    );
}
