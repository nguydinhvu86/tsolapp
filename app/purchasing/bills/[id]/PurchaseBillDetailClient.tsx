'use client';
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, ShoppingCart, CheckSquare, Building, CreditCard, Clock, Plus, Trash2, FileDown, ExternalLink, Copy, XCircle, AlertTriangle } from 'lucide-react';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import Link from 'next/link';
import { uploadPurchaseBillDocument, cancelPurchaseBill } from '@/app/purchasing/actions';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';

export function PurchaseBillDetailClient({ bill, tasks, users }: { bill: any, tasks: any[], users: any[] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'items' | 'payments' | 'tasks'>('items');

    // Document State
    const [localBill, setLocalBill] = useState(bill);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    // Pagination hooks
    const itemsPag = usePagination(bill.items || []);
    const allocationsPag = usePagination(bill.allocations || []);

    const handleCancel = async () => {
        if (confirm(`Bạn có chắc chắn muốn HỦY Hóa Đơn ${localBill.code}?\n\nHành động này sẽ:\n- Hủy phiếu Nhập Kho tương ứng\n- Giảm lại công nợ NCC.\n\nLưu ý: Không thể hủy nếu hóa đơn đã có thanh toán.`)) {
            setIsSubmitting(true);
            try {
                const updated = await cancelPurchaseBill(localBill.id);
                setLocalBill(updated);
            } catch (error: any) {
                alert(error.message || "Hủy thất bại. Hóa đơn có thể đã có thanh toán.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleCopyPublicLink = () => {
        const publicUrl = `${window.location.origin}/public/purchasing/bills/${bill.id}`;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const documents = React.useMemo(() => {
        if (!localBill.attachment) return [];
        try {
            return JSON.parse(localBill.attachment);
        } catch (e) {
            // Fallback for old single string attachment
            return [{ url: localBill.attachment, name: 'Tài liệu Gốc', uploadedAt: localBill.createdAt }];
        }
    }, [localBill.attachment]);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const remainingAmount = localBill.totalAmount - (localBill.paidAmount || 0);
    const isOverdue = localBill.dueDate && new Date(localBill.dueDate).getTime() < new Date().getTime() && localBill.status !== 'PAID' && localBill.status !== 'CANCELLED' && remainingAmount > 0;


    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">Lưu Nháp</span>;
            case 'APPROVED': return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Đã Duyệt (Nợ)</span>;
            case 'PARTIAL_PAID': return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">Thanh toán 1 phần</span>;
            case 'PAID': return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Đã Thanh Toán Tối Đa</span>;
            default: return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">{status}</span>;
        }
    };

    const tabs = [
        { id: 'items', label: 'Sản phẩm Nhập', icon: <ShoppingCart size={18} />, count: localBill.items?.length || 0 },
        { id: 'payments', label: 'Thanh Toán (Chi)', icon: <CreditCard size={18} />, count: localBill.allocations?.length || 0 },
        { id: 'tasks', label: 'Công việc', icon: <CheckSquare size={18} />, count: tasks.length },
    ] as const;

    return (
        <div style={{ padding: '2rem', maxWidth: '100%', margin: '0 auto', fontFamily: 'Inter, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #e2e8f0',
                            backgroundColor: 'white', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
                                Hóa Đơn {bill.code}
                            </h1>
                            {getStatusBadge(bill.status)}
                        </div>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Quản lý chi tiết hóa đơn, xác nhận tiền chi trả cho nhà cung cấp.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={handleCopyPublicLink}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <Copy size={16} /> {copied ? 'Đã sao chép' : 'Copy Link Gửi KH'}
                    </button>
                    <Link
                        href={`/public/purchasing/bills/${bill.id}`}
                        target="_blank"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f1f5f9', color: '#3b82f6', border: '1px solid #bfdbfe', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <ExternalLink size={16} /> Xem Bản In
                    </Link>
                    {localBill.status === 'APPROVED' && (
                        <button
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="btn btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#ea580c', border: '1px solid #fdba74', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        >
                            <XCircle size={16} /> {isSubmitting ? 'Đang xử lý...' : 'Hủy Hóa Đơn'}
                        </button>
                    )}
                    {bill.totalAmount > bill.paidAmount && (
                        <Link
                            href={`/purchasing/payments?supplierId=${bill.supplierId}`}
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        >
                            <CreditCard size={18} /> Tạo lệnh Chi tiền
                        </Link>
                    )}
                </div>
            </div>

            {isOverdue && (
                <div className="animate-overdue-bg" style={{ border: '1px solid #fde047', borderRadius: 'var(--radius, 1rem)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', color: '#854d0e', marginBottom: '2rem', backgroundColor: '#fefce8' }}>
                    <AlertTriangle size={32} className="text-yellow-500" />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>HÓA ĐƠN MUA HÀNG ĐÃ ĐẾN HẠN THANH TOÁN</h3>
                        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500, marginTop: '0.25rem' }}>Hóa đơn này đã đến hạn thanh toán cho Nhà Cung Cấp ({formatDate(localBill.dueDate)}). Vui lòng ưu tiên tạo Lệnh Chi để quyết toán công nợ.</p>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 3fr)', gap: '2rem' }}>
                {/* Left Column: Details & Tabs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Summary Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#6366f1" /> Thông tin chung
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Nhà Cung Cấp</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building size={16} color="#64748b" />
                                    <Link href={`/suppliers/${bill.supplierId}`} style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none', fontSize: '1rem' }} className="hover:underline">
                                        {bill.supplier?.name}
                                    </Link>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Tham Chiếu Đơn Hàng</p>
                                {bill.order ? (
                                    <Link href={`/purchasing/orders/${bill.order.id}`} style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none', fontSize: '1rem' }} className="hover:underline">
                                        {bill.order.code}
                                    </Link>
                                ) : <span style={{ color: '#94a3b8' }}>-- Không có --</span>}
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Ngày Hóa Đơn</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                                    <Calendar size={16} color="#64748b" />
                                    {formatDate(bill.date)}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Tình Trạng Kế Toán</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{formatMoney(bill.totalAmount)}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Cần thanh toán</p>
                                    </div>
                                    <div style={{ color: '#e2e8f0' }}>|</div>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>{formatMoney(bill.paidAmount)}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Đã chi (Đã thanh toán)</p>
                                    </div>
                                    <div style={{ color: '#e2e8f0' }}>|</div>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, color: '#ef4444', fontSize: '1rem' }}>{formatMoney(bill.totalAmount - bill.paidAmount)}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Dư nợ</p>
                                    </div>
                                </div>
                            </div>

                            {bill.notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Ghi Chú</p>
                                    <p style={{ margin: 0, color: '#475569', fontSize: '0.875rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>{bill.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs area */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        style={{
                                            flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                            backgroundColor: 'transparent', border: 'none', borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                                            color: isActive ? '#4f46e5' : '#64748b', fontWeight: isActive ? 600 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        {tab.icon} {tab.label}
                                        <span style={{ backgroundColor: isActive ? '#e0e7ff' : '#f1f5f9', color: isActive ? '#4f46e5' : '#64748b', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {activeTab === 'items' && (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Sản Phẩm</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Số Lượng</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Đơn Giá</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Thuế (%)</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Thành Tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemsPag.paginatedItems.length === 0 ? (
                                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Chưa có sản phẩm nào được nhập kho.</td></tr>
                                            ) : (
                                                itemsPag.paginatedItems.map((item: any) => (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '1rem', fontWeight: 500, color: '#1e293b' }}>
                                                            {item.product?.name || item.productName || 'Sản phẩm không xác định'}
                                                            {item.product?.sku && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>SKU: {item.product.sku}</div>}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>{item.quantity} {item.product?.unit || ''}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', color: '#475569' }}>{formatMoney(item.unitPrice)}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>{item.taxRate || 0}%</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{formatMoney(item.totalPrice)}</td>
                                                    </tr>
                                                ))
                                            )}
                                            {bill.items?.length > 0 && (
                                                <>
                                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                                        <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>Tổng tiền trước thuế:</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(bill.subTotal || 0)}</td>
                                                    </tr>
                                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                                        <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>Tổng tiền thuế:</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(bill.taxAmount || 0)}</td>
                                                    </tr>
                                                    <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                        <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>Tổng Cộng:</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>{formatMoney(bill.totalAmount)}</td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                    <Pagination {...itemsPag.paginationProps} />
                                </div>
                            )}

                            {activeTab === 'payments' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Lịch sử các lần chi trả cho Hóa đơn / Lô hàng này.</p>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã Lệnh Chi</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Ngày Phân Bổ</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Hình Thức</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Số Tiền Đã Cấn Trừ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allocationsPag.paginatedItems.length === 0 ? (
                                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Chưa có thanh toán nào được thực hiện cho hóa đơn này.</td></tr>
                                            ) : (
                                                allocationsPag.paginatedItems.map((allocation: any) => (
                                                    <tr key={allocation.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '1rem' }}>
                                                            <Link href={`/purchasing/payments/${allocation.payment?.id}`} style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }} className="hover:underline">
                                                                {allocation.payment?.code}
                                                            </Link>
                                                        </td>
                                                        <td style={{ padding: '1rem', color: '#475569' }}>{formatDate(allocation.createdAt)}</td>
                                                        <td style={{ padding: '1rem' }}>
                                                            {allocation.payment?.paymentMethod === 'BANK_TRANSFER' ? (
                                                                <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-medium">Chuyển Khoản</span>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded bg-amber-50 text-amber-600 text-xs font-medium">Tiền Mặt</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatMoney(allocation.amount)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {activeTab === 'tasks' && (
                                <div style={{ border: '1px dashed #cbd5e1', borderRadius: '0.5rem', padding: '1.5rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc' }}>
                                    Xin vui lòng xem cột Công việc bên phải.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Tasks Panel and Documents */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                            <TaskPanel
                                initialTasks={tasks}
                                users={users}
                                entityType="PURCHASE_BILL"
                                entityId={bill.id}
                            />
                        </div>

                        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileDown size={20} color="#6366f1" /> Tài liệu đính kèm
                                </h2>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="file"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                        disabled={isUploading}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setIsUploading(true);
                                            try {
                                                const uploadData = new FormData();
                                                uploadData.append('file', file);
                                                const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
                                                const data = await res.json();
                                                if (!res.ok) throw new Error(data.error);

                                                const updatedBill = await uploadPurchaseBillDocument(localBill.id, data.url, file.name);
                                                setLocalBill(updatedBill);

                                            } catch (err: any) {
                                                alert(err.message || 'Lỗi tải tệp tin');
                                            } finally {
                                                setIsUploading(false);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <button
                                        disabled={isUploading}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', backgroundColor: '#e0e7ff', color: '#4f46e5', border: 'none', fontSize: '0.875rem', fontWeight: 600, cursor: isUploading ? 'not-allowed' : 'pointer' }}
                                    >
                                        {isUploading ? 'Đang tải...' : <><Plus size={16} /> Thêm</>}
                                    </button>
                                </div>
                            </div>

                            <div style={{ padding: '1.5rem' }}>
                                {documents.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem 1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
                                        <FileText size={32} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                                        <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Chưa có tài liệu đính kèm.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {documents.map((doc: any, idx: number) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                                                    <div style={{ width: '36px', height: '36px', flexShrink: 0, borderRadius: '0.5rem', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <FileText size={18} />
                                                    </div>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#0f172a', textDecoration: 'none', display: 'block', marginBottom: '0.1rem', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="hover:text-blue-600" title={doc.name}>
                                                            {doc.name}
                                                        </a>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                            {formatDate(new Date(doc.uploadedAt))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
