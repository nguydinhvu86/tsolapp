'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, CheckSquare, Building, Link as LinkIcon, Paperclip, Upload, X, CheckCircle2, ExternalLink, Copy, XCircle, RefreshCw, Trash2, Edit2 } from 'lucide-react';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import Link from 'next/link';
import { uploadSalesPaymentDocument, cancelSalesPayment, restoreSalesPayment, deleteSalesPayment, updateSalesPayment, sendPaymentEmail } from '@/app/sales/payments/actions';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { Mail } from 'lucide-react';
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal';

export function SalesPaymentDetailClient({ payment, tasks, users, unpaidInvoices = [], emailTemplates = [] }: { payment: any, tasks: any[], users: any[], unpaidInvoices?: any[], emailTemplates?: any[] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'allocations' | 'tasks'>('allocations');
    const [isUploading, setIsUploading] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [localPayment, setLocalPayment] = useState(payment);
    const [copied, setCopied] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null);

    // Generic Action Modal State
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, title: string, message: React.ReactNode, action: () => Promise<void> } | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    // Allocation State
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [allocations, setAllocations] = useState<{ [key: string]: number }>({});

    // Derived values
    const allocatedAmount = localPayment.allocations?.reduce((acc: number, cur: any) => acc + cur.amount, 0) || 0;
    const unallocatedAmount = localPayment.amount - allocatedAmount;

    const [editData, setEditData] = useState({
        date: payment.date ? new Date(payment.date).toISOString().split('T')[0] : '',
        paymentMethod: payment.paymentMethod || 'BANK_TRANSFER',
        reference: payment.reference || '',
        notes: payment.notes || ''
    });

    const handleCopyPublicLink = () => {
        const publicUrl = `${window.location.origin}/public/sales/payments/${payment.id}`;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCancel = async () => {
        setActionModal({
            isOpen: true,
            title: 'Hủy Phiếu Thu',
            message: `Bạn có chắc chắn muốn HỦY Phiếu Thu ${localPayment.code}? Hệ thống sẽ hoàn trả công nợ.`,
            action: async () => {
                try {
                    const res = await cancelSalesPayment(localPayment.id);
                    setLocalPayment(res);
                } catch (e: any) { alert(e.message); }
            }
        });
    };

    const handleRestore = async () => {
        setActionModal({
            isOpen: true,
            title: 'Khôi Phục Phiếu Thu',
            message: `Bạn có chắc muốn KHÔI PHỤC Phiếu Thu ${localPayment.code}? Hệ thống sẽ tính lại công nợ.`,
            action: async () => {
                try {
                    const res = await restoreSalesPayment(localPayment.id);
                    setLocalPayment(res);
                } catch (e: any) { alert(e.message); }
            }
        });
    };

    const handleDelete = async () => {
        setActionModal({
            isOpen: true,
            title: 'Xóa Phiếu Thu',
            message: `Bạn có chắc chắn muốn xóa vĩnh viễn Phiếu Thu ${localPayment.code}?`,
            action: async () => {
                try {
                    await deleteSalesPayment(localPayment.id);
                    router.push('/sales/payments');
                } catch (e: any) { alert(e.message); }
            }
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                date: editData.date,
                paymentMethod: editData.paymentMethod,
                reference: editData.reference,
                notes: editData.notes,
                amount: localPayment.amount, // Keep original amount
                allocations: localPayment.allocations // Keep original allocations
            };
            const updated = await updateSalesPayment(localPayment.id, payload);
            setLocalPayment(updated);
            setIsEditModalOpen(false);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derived documents list
    const documents = React.useMemo(() => {
        if (!localPayment.attachment) return [];
        try {
            return JSON.parse(localPayment.attachment);
        } catch (e) {
            return [{ url: localPayment.attachment, name: 'Chứng từ gốc', uploadedAt: localPayment.createdAt }];
        }
    }, [localPayment.attachment]);

    const handleAllocationChange = (invoiceId: string, value: number, maxDebt: number) => {
        setAllocations(prev => {
            const currentAllocated = Object.values(prev).reduce((sum, val) => sum + (val || 0), 0);
            const thisPrev = prev[invoiceId] || 0;
            const absoluteMax = unallocatedAmount + thisPrev; // We can't allocate more than we have unallocated
            const newVal = Math.min(Math.max(0, value), maxDebt, absoluteMax);

            return { ...prev, [invoiceId]: newVal };
        });
    };

    const submitAllocations = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const newAllocList = Object.entries(allocations).map(([invoiceId, amount]) => ({ invoiceId, amount })).filter(a => a.amount > 0);
            const existingAllocList = localPayment.allocations.map((a: any) => ({ invoiceId: a.invoiceId, amount: a.amount }));

            // combine them
            const combined = [...existingAllocList, ...newAllocList];

            const payload = {
                date: localPayment.date ? new Date(localPayment.date).toISOString().split('T')[0] : '',
                paymentMethod: localPayment.paymentMethod,
                reference: localPayment.reference,
                notes: localPayment.notes,
                amount: localPayment.amount,
                allocations: combined
            };
            const updated = await updateSalesPayment(localPayment.id, payload);
            setLocalPayment(updated);
            setIsAllocationModalOpen(false);
            setAllocations({});
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = [
        { id: 'allocations', label: 'Cán trừ Hóa Đơn', icon: <LinkIcon size={18} />, count: localPayment.allocations?.length || 0 },
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
                                Phiếu Thu {localPayment.code}
                            </h1>
                            {localPayment.status === 'CANCELLED' ? (
                                <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium">Đã Hủy</span>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">Đã Thu Tiền</span>
                                    <button
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        title="Sửa thông tin phiếu"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Chi tiết giao dịch nộp tiền mặt/chuyển khoản từ khách hàng.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {localPayment.status !== 'CANCELLED' ? (
                        <>
                            <button
                                onClick={handleCancel}
                                className="btn btn-secondary hover:bg-orange-50"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#ea580c', border: '1px solid #fed7aa', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                <XCircle size={16} /> Hủy Phiếu
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleRestore}
                                className="btn btn-secondary hover:bg-green-50"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#16a34a', border: '1px solid #bbf7d0', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                <RefreshCw size={16} /> Khôi Phục
                            </button>
                            <button
                                onClick={handleDelete}
                                className="btn btn-secondary hover:bg-red-50"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                <Trash2 size={16} /> Xóa
                            </button>
                        </>
                    )}
                    <a
                        href={`/public/sales/payments/${localPayment.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        In / Xem
                    </a>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#3b82f6', border: '1px solid #bfdbfe', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <Mail size={16} /> Gửi Email
                    </button>
                    <button
                        onClick={handleCopyPublicLink}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <Copy size={16} /> {copied ? 'Đã sao chép' : 'Copy Link'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 3fr)', gap: '2rem' }}>
                {/* Left Column: Details & Tabs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Summary Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#6366f1" /> Thông tin Phiếu Thu
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Khách Hàng</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building size={16} color="#64748b" />
                                    <Link href={`/customers/${localPayment.customerId}`} style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none', fontSize: '1rem' }} className="hover:underline">
                                        {localPayment.customer?.name}
                                    </Link>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Ngày Thu Tiền</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                                    <Calendar size={16} color="#64748b" />
                                    {formatDate(localPayment.date)}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Hình Thức & Tham Chiếu</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <div>
                                        {localPayment.paymentMethod === 'BANK_TRANSFER' ? (
                                            <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-medium border border-blue-200">Chuyển Khoản</span>
                                        ) : (
                                            <span className="px-2 py-1 rounded bg-amber-50 text-amber-600 text-xs font-medium border border-amber-200">Tiền Mặt</span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tham chiếu: {localPayment.reference || 'Không có'}</span>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Tổng Số Tiền Nhận</p>
                                <p style={{ margin: 0, fontWeight: 700, color: localPayment.status === 'CANCELLED' ? '#94a3b8' : '#10b981', fontSize: '1.25rem', textDecoration: localPayment.status === 'CANCELLED' ? 'line-through' : 'none' }}>{formatMoney(localPayment.amount)}</p>
                            </div>

                            {localPayment.notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Ghi chú Biên lai</p>
                                    <p style={{ margin: 0, color: '#475569', fontSize: '0.875rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>{localPayment.notes}</p>
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
                            {activeTab === 'allocations' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Khoản tiền này đã được phân bổ để trả nợ cho các Hóa đơn sau:</p>
                                        {unallocatedAmount > 0 && unpaidInvoices && unpaidInvoices.length > 0 && localPayment.status !== 'CANCELLED' && (
                                            <button
                                                onClick={() => {
                                                    setAllocations({});
                                                    setIsAllocationModalOpen(true);
                                                }}
                                                className="btn btn-secondary"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#4f46e5', border: '1px solid #c7d2fe', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                                            >
                                                + Phân Bổ
                                            </button>
                                        )}
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Cấn trừ Hóa Đơn số</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Trạng Thái HĐ</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Giá Trị Phân Bổ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {localPayment.allocations?.length === 0 ? (
                                                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Chưa cấn trừ hóa đơn nào (Thanh toán dư nợ chung).</td></tr>
                                            ) : (
                                                localPayment.allocations?.map((allocation: any) => (
                                                    <tr key={allocation.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '1rem' }}>
                                                            <Link href={`/sales/invoices/${allocation.invoice?.id}`} style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }} className="hover:underline">
                                                                {allocation.invoice?.code}
                                                            </Link>
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            {allocation.invoice?.status === 'PAID' ? (
                                                                <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Đã Thanh Toán Khách Hàng</span>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-semibold">Còn Ghi Nợ</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatMoney(allocation.amount)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {localPayment.allocations?.length > 0 && (
                                            <tfoot>
                                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                                    <td colSpan={2} style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Tổng Phân Bổ:</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                                                        {formatMoney(localPayment.allocations.reduce((acc: number, cur: any) => acc + cur.amount, 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            )}

                            {activeTab === 'tasks' && (
                                <div style={{ border: '1px dashed #cbd5e1', borderRadius: '0.5rem', padding: '1.5rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc' }}>
                                    Xin vui lòng thao tác ở Cột Công Việc bên phải.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Tasks & Upload Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                            <TaskPanel
                                initialTasks={tasks}
                                users={users}
                                entityType="SALES_PAYMENT"
                                entityId={localPayment.id}
                            />
                        </div>

                        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Paperclip size={20} color="#6366f1" /> Tài Liệu & Chứng Từ
                                </h3>
                            </div>
                            <div style={{ padding: '1.5rem' }}>
                                {documents.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {documents.map((doc: any, i: number) => (
                                            <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                    <div style={{ backgroundColor: '#e2e8f0', padding: '0.5rem', borderRadius: '0.25rem' }}>
                                                        <FileText size={16} color="#475569" />
                                                    </div>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{doc.name}</p>
                                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{formatDate(doc.uploadedAt)}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setPreviewDoc({ url: doc.url, name: doc.name || 'Chứng từ' })} style={{ color: '#4f46e5', fontSize: '0.875rem', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }} className="hover:underline">Xem</button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', marginBottom: '1.5rem' }}>Chưa có tài liệu đính kèm.</p>
                                )}

                                <div style={{ position: 'relative' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.75rem', borderRadius: '0.5rem', border: '1px dashed #cbd5e1', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 500, transition: 'all 0.2s', width: '100%' }}>
                                        <Upload size={18} />
                                        {isUploading ? 'Đang tải lên...' : 'Tải lên UNC mới'}
                                        <input
                                            type="file"
                                            accept="image/*,.pdf,.doc,.docx"
                                            style={{ display: 'none' }}
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

                                                    // Update via Server Action
                                                    const updatedPayment = await uploadSalesPaymentDocument(localPayment.id, data.url, file.name);
                                                    setLocalPayment(updatedPayment);

                                                } catch (err: any) {
                                                    alert(err.message || 'Lỗi tải tệp tin');
                                                } finally {
                                                    setIsUploading(false);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-container bg-white dark:bg-[#1E1E1E] rounded-xl w-full flex flex-col max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Edit2 className="text-blue-500" size={20} /> Sửa Thông Tin Phiếu Thu
                            </h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="editForm" onSubmit={handleUpdate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày Thu Tiền</label>
                                    <input
                                        type="date"
                                        required
                                        value={editData.date}
                                        onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hình Thức</label>
                                        <select
                                            value={editData.paymentMethod}
                                            onChange={(e) => setEditData({ ...editData, paymentMethod: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5"
                                        >
                                            <option value="BANK_TRANSFER">Chuyển Khoản</option>
                                            <option value="CASH">Tiền Mặt</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tham Chiếu</label>
                                        <input
                                            type="text"
                                            value={editData.reference}
                                            onChange={(e) => setEditData({ ...editData, reference: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5"
                                            placeholder="Ex: UNC-123456"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ghi Chú</label>
                                    <textarea
                                        value={editData.notes}
                                        onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5"
                                        rows={3}
                                        placeholder="Nhập ghi chú (tùy chọn)..."
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-gray-700"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                form="editForm"
                                disabled={isSubmitting}
                                className={`px-6 py-2 rounded-lg font-medium text-white ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generic Action Modal */}
            {actionModal?.isOpen && (
                <div className="modal-backdrop fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="modal-container bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-md shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
                        <div className="p-6 pb-0 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${actionModal.title.toLowerCase().includes('hủy') || actionModal.title.toLowerCase().includes('xóa') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {actionModal.title.toLowerCase().includes('hủy') || actionModal.title.toLowerCase().includes('xóa') ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    )}
                                </div>
                                <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white leading-tight">
                                    {actionModal.title}
                                </h2>
                            </div>
                            <button onClick={() => !isActioning && setActionModal(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-lg transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="px-6 py-4">
                            <div className="text-gray-600 dark:text-gray-300 text-[14px] leading-relaxed ml-[52px]">
                                {actionModal.message}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setActionModal(null)}
                                disabled={isActioning}
                                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-[14px] transition-all focus:outline-none"
                            >
                                Hủy Bỏ
                            </button>
                            <button
                                className={`min-w-[120px] px-5 py-2.5 rounded-xl font-medium text-[14px] text-white flex justify-center items-center transition-all focus:outline-none shadow-sm ${actionModal.title.toLowerCase().includes('hủy') || actionModal.title.toLowerCase().includes('xóa') ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} ${isActioning ? 'opacity-80 cursor-wait' : ''}`}
                                onClick={async () => {
                                    setIsActioning(true);
                                    try {
                                        await actionModal.action();
                                        setActionModal(null);
                                    } finally {
                                        setIsActioning(false);
                                    }
                                }}
                                disabled={isActioning}
                            >
                                {isActioning ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    actionModal.title.toLowerCase().includes('hủy') || actionModal.title.toLowerCase().includes('xóa') ? 'Xác Nhận Hủy' : 'Xác Nhận'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Allocation Modal */}
            {isAllocationModalOpen && (
                <div className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-container bg-white dark:bg-[#1E1E1E] rounded-xl w-full flex flex-col max-w-3xl shadow-2xl overflow-hidden max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="text-lg font-[600] text-gray-900 dark:text-white flex items-center gap-2">
                                <LinkIcon className="text-gray-500" size={20} /> Phân Bổ Cấn Trừ Hóa Đơn Nợ
                            </h2>
                            <button onClick={() => setIsAllocationModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white pb-3 border-b-2">
                                <div className="text-gray-600 text-[15px]">
                                    Số tiền chưa phân bổ: <span className="font-bold text-gray-900 ">{formatMoney(unallocatedAmount - Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0))}</span>
                                </div>
                                <div className="sm:text-right hidden sm:block">
                                    <p className="text-sm font-[500] flex gap-1 items-center"><CheckCircle2 className="text-gray-50" color="#333" size={16} />Phân bổ tự động</p>
                                </div>
                            </div>

                            <form id="allocationForm" onSubmit={submitAllocations} className="space-y-4 pt-2">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b bg-gray-50 text-gray-600">
                                            <th className="p-3 font-semibold rounded-tl-lg">Hóa Đơn Số</th>
                                            <th className="p-3 font-semibold">Khách Hàng</th>
                                            <th className="p-3 font-semibold text-right">Tổng Tiền</th>
                                            <th className="p-3 font-semibold text-right">Đã Thu</th>
                                            <th className="p-3 font-semibold text-right">Còn Nợ</th>
                                            <th className="p-3 font-semibold text-right rounded-tr-lg">Phân Bổ Lần Này</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {unpaidInvoices?.map(inv => {
                                            const totalAllocatedToInv = inv.allocations?.reduce((s: number, a: any) => s + a.amount, 0) || 0;
                                            const debt = inv.totalAmount - totalAllocatedToInv;
                                            if (debt <= 0.01) return null; // Already paid mapping, though filter should have caught it

                                            return (
                                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 font-medium text-blue-600">{inv.code}</td>
                                                    <td className="p-3 text-gray-700">{localPayment.customer?.name}</td>
                                                    <td className="p-3 text-right">{formatMoney(inv.totalAmount)}</td>
                                                    <td className="p-3 text-right text-gray-500">{formatMoney(totalAllocatedToInv)}</td>
                                                    <td className="p-3 text-right font-bold ">{formatMoney(debt)}</td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <input
                                                                type="number"
                                                                className="border border-gray-300 rounded-lg p-2 text-right w-[160px] focus:ring-2 focus:ring-gray-300 focus:border-gray-500 outline-none transition-all"
                                                                placeholder="0"
                                                                min="0"
                                                                max={debt}
                                                                step="1"
                                                                value={allocations[inv.id] || ''}
                                                                onChange={(e) => handleAllocationChange(inv.id, Number(e.target.value), debt)}
                                                            />
                                                            <div className="flex gap-1 justify-end w-full max-w-[160px]">
                                                                <button
                                                                    type="button"
                                                                    className="text-xs text-gray-900 border font-[500] px-2 py-0.5"
                                                                    onClick={() => {
                                                                        const currentVal = allocations[inv.id] || 0;
                                                                        const remainingUnalloc = unallocatedAmount - Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0) + currentVal;
                                                                        const recommendVal = Math.min(debt, remainingUnalloc);
                                                                        handleAllocationChange(inv.id, recommendVal, debt);
                                                                    }}
                                                                >
                                                                    Điền {formatMoney(debt)}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {(!unpaidInvoices || unpaidInvoices.length === 0) && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-400 border-b">
                                                    Không có hóa đơn nợ nào có thể cấp tiền.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </form>
                        </div>
                        <div className="p-5 border-t border-gray-100 bg-white flex justify-start gap-4 pb-8 pl-8">
                            <button
                                type="button"
                                onClick={() => setIsAllocationModalOpen(false)}
                                className="px-6 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-all font-medium text-sm"
                                style={{ borderColor: '#64748b', color: '#1e293b' }}
                            >
                                Hủy Bỏ
                            </button>
                            <button
                                type="submit"
                                form="allocationForm"
                                disabled={isSubmitting || Object.keys(allocations).length === 0 || Object.values(allocations).every(v => !v)}
                                className={`px-6 py-2 rounded-lg font-semibold min-w-[140px] transition-all text-sm shadow-sm ${isSubmitting || Object.keys(allocations).length === 0 || Object.values(allocations).every(v => !v) ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-100' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                {isSubmitting ? 'Đang phân bổ...' : 'Xác Nhận Phân Bổ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Modal */}
            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                templates={emailTemplates}
                moduleType="PAYMENT_CONFIRMATION"
                variablesData={{
                    code: localPayment.code,
                    amount: formatMoney(localPayment.amount),
                    date: formatDate(localPayment.date),
                    customerName: localPayment.customer?.name || '',
                    customerEmail: localPayment.customer?.email || '',
                    link: typeof window !== 'undefined' ? `${window.location.origin}/public/sales/payments/${localPayment.id}` : ''
                }}
                onSend={async (emailData) => {
                    const res = await sendPaymentEmail(localPayment.id, emailData.to, emailData.subject, emailData.htmlBody);
                    if (res?.success) alert("Đã gửi email xác nhận thanh toán thành công!");
                    else alert("Lỗi khi gửi email: " + res?.error);
                }}
            />

            {previewDoc && (
                <DocumentPreviewModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    fileUrl={previewDoc.url}
                    fileName={previewDoc.name}
                />
            )}
        </div>
    );
}
