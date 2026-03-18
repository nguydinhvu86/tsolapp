'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Copy, CheckCircle2, User, FileText, ShoppingCart, Info, CheckSquare, XCircle, Undo2, History, ArrowRight, Clock, AlertTriangle, PackageCheck, Activity, Edit } from 'lucide-react';
import Link from 'next/link';
import { approveSalesInvoice, updateSalesInvoiceStatus, cancelSalesInvoice, restoreSalesInvoice, paySalesInvoice } from '../actions';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { SalesInvoiceNotes } from '@/app/components/sales/SalesInvoiceNotes';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { sendInvoiceEmail, assignSalesInvoiceManagers, removeSalesInvoiceManager } from '../actions';
import { useSession } from 'next-auth/react';
import { Mail, UserCheck } from 'lucide-react';
import { DocumentManagersPanel } from '@/app/components/shared/DocumentManagersPanel';
import { EmailLogTable } from '@/app/components/ui/EmailLogTable';

export default function SalesInvoiceDetailClient({ initialData, customers, products, users, emailTemplates }: any) {
    const router = useRouter();
    const { data: session } = useSession();
    const [invoice, setInvoice] = useState(initialData);
    const [activeTab, setActiveTab] = useState<'items' | 'emailLogs' | 'managers'>('items');
    const [copied, setCopied] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentData, setPaymentData] = useState({ amount: 0, method: 'BANK_TRANSFER', notes: '' });
    const [diffModal, setDiffModal] = useState<{ isOpen: boolean, changes: string[] }>({ isOpen: false, changes: [] });

    // Email Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Action Modal State
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean,
        title: string,
        message: React.ReactNode,
        action: () => Promise<void>,
        icon?: React.ReactNode,
        confirmLabel?: string,
        cancelLabel?: string,
        confirmVariant?: 'primary' | 'danger' | 'warning' | 'success'
    } | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    // Calculate remaining amount
    const remainingAmount = invoice.totalAmount - (invoice.paidAmount || 0);

    // Calculate if overdue
    const isOverdue = invoice.dueDate && new Date(invoice.dueDate).getTime() < new Date().getTime() && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && remainingAmount > 0;

    useEffect(() => {
        setInvoice(initialData);
    }, [initialData]);

    const handleCopyPublicLink = () => {
        const publicUrl = `${window.location.origin}/public/sales/invoice/${invoice.id}`;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };


    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold border border-gray-200">Bản Dự Thảo</span>;
            case 'ISSUED': return <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold border border-blue-200">Ghi Nhận Nợ / Xuất Kho</span>;
            case 'PARTIAL_PAID': return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold border border-amber-200">Đã Thu Một Phần</span>;
            case 'PAID': return <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold border border-green-200">Hoàn Tất Thu</span>;
            case 'CANCELLED': return <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-semibold border border-red-200">Đã Hủy</span>;
            default: return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold border border-gray-200">{status}</span>;
        }
    };

    const handleApprove = async () => {
        setActionModal({
            isOpen: true,
            title: 'Khởi Tạo & Duyệt Hóa Đơn',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Bạn đã kiểm tra kỹ hóa đơn?</h4>
                    <p style={{ color: '#4b5563', marginBottom: '1rem' }}>Sau khi tiến hành duyệt, hệ thống sẽ thực thi ngay các tác vụ sau đây:</p>
                    <ul style={{ listStyle: 'none', padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                            <span style={{ color: '#10b981', background: '#d1fae5', padding: '0.25rem', borderRadius: '50%', marginTop: '0.125rem', display: 'flex' }}><CheckCircle2 size={16} /></span>
                            <span><strong>Ghi nhận công nợ</strong> đối với khách hàng này vào hệ thống kế toán.</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                            <span style={{ color: '#10b981', background: '#d1fae5', padding: '0.25rem', borderRadius: '50%', marginTop: '0.125rem', display: 'flex' }}><PackageCheck size={16} /></span>
                            <span><strong>Tự động xuất kho</strong> trừ tồn các sản phẩm có trong hóa đơn.</span>
                        </li>
                    </ul>
                </div>
            ),
            confirmLabel: 'Đồng Ý Duyệt',
            confirmVariant: 'success',
            action: async () => {
                const res = await approveSalesInvoice(invoice.id, 'system');
                if (res.success) {
                    alert('Đã duyệt hóa đơn, xuất kho và ghi nhận nợ thành công!');
                    router.refresh();
                } else alert(res.error);
            }
        });
    };

    const handleStatusChange = async (newStatus: string) => {
        setActionModal({
            isOpen: true,
            title: 'Chuyển trạng thái',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Info size={24} /></div>,
            message: <p style={{ color: '#374151', fontSize: '0.9375rem' }}>Xác nhận đổi trạng thái Hóa đơn thành <strong>{newStatus === 'PAID' ? 'Hoàn Tất Thu' : newStatus}</strong>?</p>,
            confirmLabel: 'Chuyển Đổi',
            confirmVariant: 'primary',
            action: async () => {
                const res = await updateSalesInvoiceStatus(invoice.id, newStatus);
                if (res.success) {
                    setInvoice({ ...invoice, status: newStatus });
                    router.refresh();
                } else alert(res.error);
            }
        });
    };

    const openPartialPaymentModal = () => {
        setPaymentData({ amount: remainingAmount, method: 'BANK_TRANSFER', notes: `Thu tiền một phần hóa đơn ${invoice.code}` });
        setIsPaymentModalOpen(true);
    };

    const handleSubmitPayment = async () => {
        if (paymentData.amount <= 0 || paymentData.amount > remainingAmount) {
            alert('Số tiền không hợp lệ. Phải lớn hơn 0 và không vượt quá số còn nợ.');
            return;
        }
        const res = await paySalesInvoice(invoice.id, paymentData.amount, paymentData.method, '', paymentData.notes);
        if (res.success) {
            alert('Đã thu tiền và tạo Phiếu Thu thành công!');
            setIsPaymentModalOpen(false);
            router.refresh();
        } else alert('Lỗi: ' + res.error);
    };

    const handleFullPayment = async () => {
        setActionModal({
            isOpen: true,
            title: 'Thu Toàn Bộ Phần Còn Lại',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Thanh toán toàn bộ phần còn lại?</h4>
                    <p style={{ color: '#4b5563', padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #f3f4f6', marginBottom: '1rem', lineHeight: 1.6 }}>Hệ thống sẽ tự động tạo Phiếu Thu cho phần nợ còn lại <strong>({formatMoney(remainingAmount)})</strong> và tự động trừ công nợ khách hàng đối với hóa đơn này.</p>
                </div>
            ),
            confirmLabel: 'Xác Nhận & Tạo Phiếu Thu',
            confirmVariant: 'success',
            action: async () => {
                const res = await paySalesInvoice(invoice.id, remainingAmount, 'BANK_TRANSFER', '', `Thu toàn bộ phần còn lại hóa đơn ${invoice.code}`);
                if (res.success) {
                    alert('Đã thu đủ Hóa Đơn thành công!');
                    router.refresh();
                } else alert('Lỗi: ' + res.error);
            }
        });
    };

    const handleCancel = async () => {
        setActionModal({
            isOpen: true,
            title: 'Hủy Hóa Đơn',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Hủy Hóa Đơn Này?</h4>
                    <p style={{ color: '#4b5563', padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #f3f4f6', marginBottom: '1rem', lineHeight: 1.6 }}>Các chứng từ báo cáo xuất kho và công nợ liên quan sẽ được hệ thống <strong>tự động hoàn tác</strong>. Mọi tác vụ về sau sẽ không thể phục hồi. Bạn đã chắc chắn?</p>
                </div>
            ),
            confirmLabel: 'Xác Nhận Hủy',
            confirmVariant: 'danger',
            action: async () => {
                const res = await cancelSalesInvoice(invoice.id);
                if (res.success) {
                    alert('Hủy Hóa Đơn và hoàn tác dữ liệu thành công!');
                    setInvoice({ ...invoice, status: 'CANCELLED' });
                    router.refresh();
                } else alert(res.error);
            }
        });
    };

    const handleRestore = async () => {
        setActionModal({
            isOpen: true,
            title: 'Khôi phục Hóa Đơn',
            icon: <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Undo2 size={24} /></div>,
            message: (
                <div>
                    <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Tiến hành khôi phục chứng từ?</h4>
                    <p style={{ color: '#4b5563', padding: '1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #f3f4f6', marginBottom: '1rem', lineHeight: 1.6 }}>Việc khôi phục sẽ kích hoạt việc <strong>ghi nhận lại công nợ</strong> và <strong>xuất lại kho tự động</strong> đối với các vật tư có trên hóa đơn này.</p>
                </div>
            ),
            confirmLabel: 'Đồng Ý Khôi Phục',
            confirmVariant: 'success',
            action: async () => {
                const res = await restoreSalesInvoice(invoice.id);
                if (res.success) {
                    alert('Đã khôi phục hóa đơn thành công!');
                    setInvoice({ ...invoice, status: 'ISSUED' });
                    router.refresh();
                } else alert(res.error);
            }
        });
    };

    const tabs = [
        { id: 'items', label: 'Chi tiết sản phẩm xuất bán', icon: <ShoppingCart size={18} />, count: invoice.items?.length || 0 }
    ] as const;

    return (
        <div style={{ padding: '0', maxWidth: '100%', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => router.push('/sales/invoices')}
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
                                Hóa Đơn {invoice.code}
                            </h1>
                            {getStatusBadge(invoice.status)}
                            {invoice.orderId && <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold">Kế thừa: {invoice.order?.code || 'Order'}</span>}
                        </div>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Chi tiết Hóa đơn bán hàng, Công nợ và Lịch sử thanh toán.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button
                        onClick={handleCopyPublicLink}
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <Copy size={16} /> {copied ? 'Đã sao chép' : 'Copy Link Gửi KH'}
                    </button>
                    <Link
                        href={`/print/sales/invoice/${invoice.id}`}
                        target="_blank"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f1f5f9', color: '#3b82f6', border: '1px solid #bfdbfe', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <ExternalLink size={16} /> Xem Bản In
                    </Link>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <Mail size={16} /> Gửi Email
                    </button>
                    {invoice.status === 'DRAFT' && (
                        <button
                            onClick={handleApprove}
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        >
                            <CheckCircle2 size={18} /> Ghi Nhận & Xuất Kho
                        </button>
                    )}
                    {invoice.status === 'ISSUED' && (
                        <>
                            <button
                                onClick={openPartialPaymentModal}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                Thu Một Phần
                            </button>
                            <button
                                onClick={handleFullPayment}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                Đã Thu Đủ Tiền
                            </button>
                        </>
                    )}
                    {invoice.status === 'PARTIAL_PAID' && (
                        <>
                            <button
                                onClick={openPartialPaymentModal}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                Tiếp Tục Thu Một Phần
                            </button>
                            <button
                                onClick={handleFullPayment}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                Đã Thu Đủ Tiền
                            </button>
                        </>
                    )}

                    {invoice.status !== 'CANCELLED' && (
                        <button
                            onClick={handleCancel}
                            className="btn btn-secondary hover:bg-red-50"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'white', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        >
                            <XCircle size={18} /> Hủy Hóa Đơn
                        </button>
                    )}
                    {invoice.status === 'CANCELLED' && (
                        <button
                            onClick={handleRestore}
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        >
                            <Undo2 size={18} /> Khôi Phục Hóa Đơn
                        </button>
                    )}
                </div>
            </div>

            {isOverdue && (
                <div className="animate-priority-urgent-bg" style={{ border: '2px solid #ef4444', borderRadius: 'var(--radius, 1rem)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', color: '#991b1b', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)', marginBottom: '2rem', backgroundColor: '#fef2f2', animation: 'priority-urgent-bg-blink 1.5s linear infinite' }}>
                    <AlertTriangle size={32} />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>HÓA ĐƠN ĐÃ QUÁ HẠN THANH TOÁN</h3>
                        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600, marginTop: '0.25rem' }}>Hóa đơn này đã quá hạn thanh toán ({formatDate(invoice.dueDate)}). Vui lòng ưu tiên xử lý và thu hồi công nợ.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Left Column: Details & Tabs */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Summary Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Thông tin chung</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                                        {invoice.creator && (
                                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <User size={14} /> Lập bởi: {invoice.creator.name}
                                            </p>
                                        )}
                                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <User size={14} /> Người bán: {invoice.salesperson?.name || invoice.creator?.name || '---'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Tổng thanh toán</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{formatMoney(invoice.totalAmount)}</div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Khách Hàng</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 500, color: '#0f172a' }}>{invoice.customer?.name}</div>
                                    <a href={`/customers/${invoice.customerId}`} style={{ fontSize: '0.875rem', color: '#3b82f6', textDecoration: 'none', display: 'inline-block', marginTop: '0.25rem' }}>Xem hồ sơ khách hàng →</a>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Ngày Lập</div>
                                        <div style={{ fontSize: '0.875rem', color: '#334155' }}>{formatDate(invoice.date)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Hạn Thanh Toán</div>
                                        <div style={{ fontSize: '0.875rem', color: '#334155' }}>{formatDate(invoice.dueDate)}</div>
                                    </div>
                                </div>

                                {invoice.notes && (
                                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px dashed #cbd5e1' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Ghi chú Hóa Đơn</div>
                                        <div style={{ fontSize: '0.875rem', color: '#334155', whiteSpace: 'pre-wrap' }}>{invoice.notes}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs Area */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                        <div className="flex overflow-x-auto whitespace-nowrap border-b border-gray-200 px-2 pb-1 sm:pb-0 scrollbar-hide">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.25rem',
                                        fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        borderBottom: activeTab === tab.id ? '2px solid #4f46e5' : '2px solid transparent',
                                        color: activeTab === tab.id ? '#4f46e5' : '#64748b',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    <span style={{
                                        backgroundColor: activeTab === tab.id ? '#e0e7ff' : '#f1f5f9',
                                        color: activeTab === tab.id ? '#4f46e5' : '#64748b',
                                        padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600
                                    }}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                            <button
                                onClick={() => setActiveTab('emailLogs')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.25rem',
                                    fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'emailLogs' ? '2px solid #4f46e5' : '2px solid transparent',
                                    color: activeTab === 'emailLogs' ? '#4f46e5' : '#64748b',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Mail size={16} />
                                Lịch Sử Email
                                <span style={{
                                    backgroundColor: activeTab === 'emailLogs' ? '#e0e7ff' : '#f1f5f9',
                                    color: activeTab === 'emailLogs' ? '#4f46e5' : '#64748b',
                                    padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600
                                }}>
                                    {invoice.emailLogs?.length || 0}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('managers')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.25rem',
                                    fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderBottom: activeTab === 'managers' ? '2px solid #4f46e5' : '2px solid transparent',
                                    color: activeTab === 'managers' ? '#4f46e5' : '#64748b',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <UserCheck size={16} />
                                Người Phụ Trách
                                <span style={{
                                    backgroundColor: activeTab === 'managers' ? '#e0e7ff' : '#f1f5f9',
                                    color: activeTab === 'managers' ? '#4f46e5' : '#64748b',
                                    padding: '0.125rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600
                                }}>
                                    {invoice.managers?.length || 0}
                                </span>
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {activeTab === 'items' && (
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full min-w-[700px] border-collapse text-sm">
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                                                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Tên Sản phẩm / Dịch vụ</th>
                                                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Số Lượng</th>
                                                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Đơn Giá</th>
                                                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Thuế suất</th>
                                                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, textAlign: 'right' }}>Thành Tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoice.items?.map((item: any, idx: number) => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '1rem 0.5rem', color: '#0f172a', fontWeight: 500 }}>
                                                        {item.customName || item.product?.name || `Sản phẩm tự do`}
                                                        {item.product?.sku && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>SKU: {item.product.sku}</div>}
                                                        {item.description && <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem', whiteSpace: 'pre-wrap', fontWeight: 400 }}>{item.description}</div>}
                                                    </td>
                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#334155' }}>
                                                        {item.quantity} <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.25rem' }}>{item.unit || item.product?.unit || ''}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#334155' }}>{formatMoney(item.unitPrice)}</td>
                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#334155' }}>{item.taxRate}%</td>
                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{formatMoney(item.totalPrice)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Totals Box */}
                                    <div className="mt-8 flex justify-end w-full">
                                        <div className="w-full sm:w-80 bg-slate-50 rounded-xl p-6 border border-slate-200">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.875rem', color: '#475569' }}>
                                                <span>Tổng tiền hàng:</span>
                                                <span style={{ fontWeight: 500, color: '#0f172a' }}>{formatMoney(invoice.subTotal)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.875rem', color: '#475569' }}>
                                                <span>Thuế GTGT ({invoice.items?.[0]?.taxRate || 0}%):</span>
                                                <span style={{ fontWeight: 500, color: '#0f172a' }}>{formatMoney(invoice.taxAmount)}</span>
                                            </div>
                                            <div style={{ height: '1px', backgroundColor: '#cbd5e1', margin: '1rem 0' }}></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <span style={{ fontWeight: 600, color: '#0f172a' }}>Tổng Hóa Đơn:</span>
                                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e11d48' }}>{formatMoney(invoice.totalAmount)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                                                <span style={{ color: '#475569' }}>Đã Thu Trước Đó:</span>
                                                <span style={{ fontWeight: 600, color: '#059669' }}>{formatMoney(invoice.paidAmount || 0)}</span>
                                            </div>
                                            <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>Còn Phải Thu:</span>
                                                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: remainingAmount > 0 ? '#e11d48' : '#059669' }}>{formatMoney(remainingAmount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'emailLogs' && (
                                <EmailLogTable emailLogs={invoice.emailLogs || []} />
                            )}

                            {activeTab === 'managers' && (
                                <DocumentManagersPanel
                                    documentId={invoice.id}
                                    managers={invoice.managers || []}
                                    users={users || []}
                                    currentUserRole={session?.user?.role || 'USER'}
                                    onAssign={assignSalesInvoiceManagers}
                                    onRemove={removeSalesInvoiceManager}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Related Tasks and History */}
                <div className="lg:col-span-1 flex flex-col gap-6">

                    {/* Invoice Notes Panel */}
                    <SalesInvoiceNotes
                        invoiceId={invoice.id}
                        notes={invoice.invoiceNotes || []}
                        currentUserId={session?.user?.id || ''}
                        currentUserRole={session?.user?.role || ''}
                    />

                    {/* Task Panel */}
                    <div>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckSquare size={18} /> Công việc & Phối hợp
                        </h2>
                        <TaskPanel
                            initialTasks={invoice.tasks || []}
                            users={users || []}
                            entityType="SALES_INVOICE"
                            entityId={invoice.id}
                        />
                    </div>

                    {/* Invoice History Panel */}
                    <div>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <History size={18} /> Lịch Sử Hóa Đơn
                        </h2>
                        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>

                            {/* 1. Related Order / Quote */}
                            {invoice.order && (
                                <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Từ Đơn Hàng / Báo Giá</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ShoppingCart size={14} color="#475569" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{invoice.order.code}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ngày tạo: {formatDate(invoice.order.date)}</div>
                                        </div>
                                        <Link href={`/sales/orders/${invoice.order.id}`} style={{ marginLeft: 'auto', color: '#3b82f6' }}>
                                            <ArrowRight size={16} />
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* 2. Payment History */}
                            {invoice.allocations && invoice.allocations.length > 0 && (
                                <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Lịch Sử Thanh Toán</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {invoice.allocations.map((alloc: any, index: number) => (
                                            <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <span style={{ color: '#16a34a', fontSize: '1rem', fontWeight: 'bold' }}>$</span>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>{alloc.payment?.code || 'Phiếu Thu'}</span>
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#16a34a' }}>+ {formatMoney(alloc.amount)}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                                                        {formatDate(alloc.payment?.date)} • {alloc.payment?.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : alloc.payment?.paymentMethod === 'CREDIT_CARD' ? 'Thẻ' : 'Tiền mặt'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 3. Activity Log (Tasks context) */}
                            <div style={{ padding: '1.25rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Nhật Ký Hoạt Động</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {invoice.activityLogs && invoice.activityLogs.length > 0 ? (
                                        invoice.activityLogs.map((log: any, index: number) => (
                                            <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                                <div style={{ marginTop: '0.125rem' }}>
                                                    {log.action === 'CREATED' || log.action === 'TẠO_HÓA_ĐƠN' ? <Clock size={16} color="#94a3b8" /> :
                                                        log.action === 'UPDATED' || log.action === 'CẬP_NHẬT' ? <Edit size={16} color="#f59e0b" /> :
                                                            log.action === 'STATUS_CHANGED' || log.action === 'CẬP_NHẬT_TRẠNG_THÁI' || log.action === 'APPROVED' ? <CheckCircle2 size={16} color="#10b981" /> :
                                                                <Activity size={16} color="#64748b" />}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', color: '#334155' }}>
                                                        {log.action === 'CREATED' ? `Hóa đơn được tạo bởi ` :
                                                            log.action === 'TẠO_HÓA_ĐƠN' ? `Hóa đơn được tạo bởi ` :
                                                                log.action === 'UPDATED' ? `Hóa đơn được cập nhật bởi ` :
                                                                    log.action === 'CẬP_NHẬT' ? `Hóa đơn được cập nhật bởi ` :
                                                                        log.action === 'STATUS_CHANGED' ? `Trạng thái thay đổi bởi ` :
                                                                            log.action === 'CẬP_NHẬT_TRẠNG_THÁI' ? `Trạng thái thay đổi bởi ` :
                                                                                log.action === 'APPROVED' ? `Hóa đơn được duyệt bởi ` :
                                                                                    `Thao tác bởi `}
                                                        <span style={{ fontWeight: 600 }}>{log.user?.name || log.userId || 'Hệ thống'}</span>
                                                    </div>
                                                    {log.details && (
                                                        <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.125rem' }}>
                                                            {(() => {
                                                                try {
                                                                    const parsed = JSON.parse(log.details);
                                                                    if (parsed.type === 'UPDATE_DIFF') {
                                                                        return (
                                                                            <div>
                                                                                <div>{parsed.summary}</div>
                                                                                <button
                                                                                    onClick={() => setDiffModal({ isOpen: true, changes: parsed.changes })}
                                                                                    style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: '0.25rem', textDecoration: 'underline' }}
                                                                                >
                                                                                    Xem chi tiết thay đổi
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    }
                                                                } catch (e) {
                                                                    return log.details;
                                                                }
                                                                return log.details;
                                                            })()}
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{formatDate(log.createdAt)}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                            <div style={{ marginTop: '0.125rem' }}>
                                                <Clock size={16} color="#94a3b8" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', color: '#334155' }}>Hóa đơn được tạo bởi <span style={{ fontWeight: 600 }}>{invoice.creator?.name || 'Hệ thống'}</span></div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDate(invoice.createdAt)}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>


                </div>

                <Modal isOpen={diffModal.isOpen} onClose={() => setDiffModal({ ...diffModal, isOpen: false })} title="Chi Tiết Cập Nhật">
                    <div style={{ padding: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
                        <ul style={{ paddingLeft: '1.25rem', color: '#334155', fontSize: '0.9375rem', lineHeight: '1.6', margin: 0 }}>
                            {diffModal.changes.map((change, i) => (
                                <li key={i} style={{ marginBottom: '0.5rem' }}>{change}</li>
                            ))}
                        </ul>
                    </div>
                </Modal>

                <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Thu Tiền Hóa Đơn">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem' }}>
                        {/* Summary Card */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Tổng Hóa Đơn:</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatMoney(invoice.totalAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>Đã Thu Trước Đó:</span>
                                <span style={{ fontWeight: 600, color: '#059669' }}>{formatMoney(invoice.paidAmount)}</span>
                            </div>
                            <div style={{ height: '1px', backgroundColor: '#e2e8f0', width: '100%', marginBottom: '1rem' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em', fontSize: '0.875rem' }}>Còn Phải Thu:</span>
                                <span style={{ fontWeight: 700, color: '#e11d48', fontSize: '1.25rem' }}>{formatMoney(remainingAmount)}</span>
                            </div>
                        </div>

                        {/* Inputs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>Số tiền thực thu (VND)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={remainingAmount}
                                    style={{ width: '100%', padding: '0.625rem 0.75rem', fontSize: '1.125rem', fontWeight: 500, color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '0.5rem', outline: 'none', transition: 'border-color 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>Phương thức thanh toán</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        style={{ width: '100%', padding: '0.625rem 2.5rem 0.625rem 0.75rem', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '0.5rem', appearance: 'none', backgroundColor: 'white', outline: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                                        value={paymentData.method}
                                        onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                                    >
                                        <option value="CASH">Tiền mặt</option>
                                        <option value="BANK_TRANSFER">Chuyển khoản</option>
                                        <option value="CREDIT_CARD">Thẻ Tín Dụng / Ghi Nợ</option>
                                    </select>
                                    <div style={{ pointerEvents: 'none', position: 'absolute', inset: '0 0 0 auto', display: 'flex', alignItems: 'center', padding: '0 0.75rem', color: '#64748b' }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '1rem', height: '1rem' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>Diễn giải / Ghi chú</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '0.625rem 0.75rem', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '0.5rem', outline: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                    value={paymentData.notes}
                                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                                    placeholder="Ghi chú thêm về giao dịch này..."
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                style={{ padding: '0.625rem 1.25rem', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '0.5rem', backgroundColor: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitPayment}
                                style={{ padding: '0.625rem 1.25rem', border: 'none', color: 'white', borderRadius: '0.5rem', backgroundColor: '#2563eb', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                            >
                                Xác nhận Thu & Tạo Phiếu
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Action Confirm Modal */}
                <Modal isOpen={!!actionModal?.isOpen} onClose={() => !isActioning && setActionModal(null)} title={actionModal?.title || 'Xác nhận'}>
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {actionModal?.icon && (
                                <div style={{ flexShrink: 0, marginTop: '0.25rem' }}>
                                    {actionModal.icon}
                                </div>
                            )}
                            <div style={{ flex: 1, color: 'var(--text-main)', fontSize: '0.9375rem', lineHeight: '1.6' }}>
                                {actionModal?.message}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                            <button onClick={() => setActionModal(null)} className="btn btn-secondary" disabled={isActioning}>
                                {actionModal?.cancelLabel || 'Hủy Bỏ'}
                            </button>
                            <button onClick={async () => {
                                if (!actionModal) return;
                                setIsActioning(true);
                                try {
                                    await actionModal.action();
                                } finally {
                                    setIsActioning(false);
                                    setActionModal(null);
                                }
                            }} className={`btn ${actionModal?.confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                                style={actionModal?.confirmVariant === 'success' ? { backgroundColor: 'var(--success)' } :
                                    actionModal?.confirmVariant === 'warning' ? { backgroundColor: '#f59e0b' } : {}}
                                disabled={isActioning}>
                                {isActioning ? (
                                    <span style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '8px' }}></span>
                                        Đang xử lý...
                                    </span>
                                ) : (actionModal?.confirmLabel || 'Xác Nhận')}
                            </button>
                        </div>
                    </div>
                </Modal>

                <SendEmailModal
                    isOpen={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    moduleType="INVOICE"
                    defaultToEmail={invoice.customer?.email || ''}
                    variablesData={{
                        customerName: invoice.customer?.name || '',
                        customerEmail: invoice.customer?.email || '',
                        senderName: invoice.salesperson?.name || invoice.creator?.name || '',
                        today: new Date().toLocaleDateString('vi-VN'),
                        code: invoice.code,
                        totalAmount: formatMoney(invoice.totalAmount),
                        link: `${window.location.origin}/public/sales/invoice/${invoice.id}`
                    }}
                    templates={emailTemplates || []}
                    printUrl={`${window.location.origin}/public/sales/invoice/${invoice.id}`}
                    documentName={`HoaDon_${invoice.code}.pdf`}
                    onSend={async (data) => {
                        const res = await sendInvoiceEmail(invoice.id, data.to, data.subject, data.htmlBody, data.attachmentName, data.attachmentBase64);
                        if (res.success) {
                            alert('Đã gửi email thành công!');
                            router.refresh();
                        } else {
                            throw new Error(res.error);
                        }
                    }}
                />
            </div>
        </div>
    );
}
