'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, ShoppingCart, CheckSquare, Building, FileDown, Plus, ExternalLink, Copy, User, ArrowRightLeft, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { updateSalesOrderStatus, convertOrderToInvoice } from '../actions';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { Modal } from '@/app/components/ui/Modal';
import { SendEmailModal } from '@/app/components/ui/modals/SendEmailModal';
import { sendOrderEmail } from '../actions';
import { Mail } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';

export default function SalesOrderDetailClient({ initialData, customers, products, users, emailTemplates }: any) {
    const { data: session } = useSession() as any;
    const router = useRouter();
    const [order, setOrder] = useState(initialData);
    const [activeTab, setActiveTab] = useState<'items'>('items');
    const [copied, setCopied] = useState(false);
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    // Email Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // Generic Action Modal State
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, title: string, message: React.ReactNode, action: () => Promise<void> } | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    useEffect(() => {
        setOrder(initialData);
    }, [initialData]);

    const handleCopyPublicLink = () => {
        const publicUrl = `${window.location.origin}/public/sales/order/${order.id}`;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };


    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">Bản Dự Thảo</span>;
            case 'CONFIRMED': return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Chốt Đơn</span>;
            case 'COMPLETED': return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Hoàn Thành</span>;
            case 'CANCELLED': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Đã Hủy</span>;
            default: return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">{status}</span>;
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        setActionModal({
            isOpen: true,
            title: 'Chuyển Trạng Thái',
            message: `Xác nhận đổi trạng thái đơn đặt hàng thành: ${newStatus}?`,
            action: async () => {
                const res = await updateSalesOrderStatus(order.id, newStatus);
                if (res.success) {
                    setOrder({ ...order, status: newStatus });
                    router.refresh();
                } else {
                    alert(res.error);
                }
            }
        });
    };

    const handleConfirmConvert = async () => {
        setIsConverting(true);
        const res = await convertOrderToInvoice(order.id);
        if (res.success) {
            alert("Đã tạo Hóa Đơn thành công, đang chuyển hướng...");
            router.push('/sales/invoices');
        } else {
            alert(res.error);
            setIsConverting(false);
            setIsConvertModalOpen(false);
        }
    };

    const tabs = [
        { id: 'items', label: 'Chi tiết sản phẩm', icon: <ShoppingCart size={18} />, count: order.items?.length || 0 }
    ] as const;

    return (
        <div style={{ padding: '0', maxWidth: '100%', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
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
                                Đơn Hàng {order.code}
                            </h1>
                            {getStatusBadge(order.status)}
                        </div>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Quản lý chi tiết đơn hàng và các công việc liên quan.</p>
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
                        href={`/print/sales/order/${order.id}`}
                        target="_blank"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f1f5f9', color: '#3b82f6', border: '1px solid #bfdbfe', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <ExternalLink size={16} /> Xem Bản In
                    </Link>
                    <button
                        onClick={() => router.push(`/sales/orders?edit=${order.id}`)}
                        className="btn btn-secondary hover:bg-slate-100 transition-colors"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <Edit2 size={16} /> Chỉnh Sửa
                    </button>
                    <button
                        onClick={() => setIsEmailModalOpen(true)}
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <Mail size={16} /> Gửi Email
                    </button>
                    {(order.status === 'DRAFT' || order.status === 'CONFIRMED') && (
                        <button
                            onClick={() => setIsConvertModalOpen(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', cursor: 'pointer', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        >
                            <ArrowRightLeft size={16} /> Lên Hóa Đơn
                        </button>
                    )}

                    {order.status === 'DRAFT' && (
                        <button
                            onClick={() => handleStatusChange('CONFIRMED')}
                            className="btn btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                        >
                            Chốt Đơn Mới
                        </button>
                    )}
                    {order.status === 'CONFIRMED' && (
                        <>
                            <button
                                onClick={() => handleStatusChange('COMPLETED')}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                Xác nhận Hoàn Thành
                            </button>
                            <button
                                onClick={() => handleStatusChange('CANCELLED')}
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                            >
                                Hủy Đơn Hàng
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mt-6">
                {/* Left Column: Details & Tabs */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Summary Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#6366f1" /> Thông tin chung
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>KHÁCH HÀNG</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building size={16} color="#64748b" />
                                    <Link href={`/customers/${order.customerId}`} style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none', fontSize: '1rem' }} className="hover:underline">
                                        {order.customer?.name}
                                    </Link>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>NGÀY LẬP TỪ</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                                    <Calendar size={16} color="#64748b" />
                                    {formatDate(order.date)}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>NHÂN VIÊN LẬP</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                                    <User size={16} color="#64748b" />
                                    {order.creator?.name || '---'}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>TỔNG GIÁ TRỊ</p>
                                <p style={{ margin: 0, fontWeight: 700, color: '#10b981', fontSize: '1.125rem' }}>{formatMoney(order.totalAmount)}</p>
                            </div>
                            {order.notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>GHI CHÚ</p>
                                    <p style={{ margin: 0, color: '#475569', fontSize: '0.875rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>{order.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs area */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                        <div className="flex overflow-x-auto whitespace-nowrap border-b border-gray-200 px-2 pb-1 sm:pb-0 scrollbar-hide">
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

                        <div className="p-4 sm:p-6">
                            {activeTab === 'items' && (
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full min-w-[700px] text-left text-sm border-collapse">
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
                                            {order.items?.length === 0 ? (
                                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Chưa có sản phẩm nào.</td></tr>
                                            ) : (
                                                order.items?.map((item: any) => (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '1rem', fontWeight: 500, color: '#1e293b' }}>
                                                            {item.customName || item.product?.name || 'Sản phẩm tự do'}
                                                            {item.product?.sku && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>SKU: {item.product.sku}</div>}
                                                            {item.description && <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem', whiteSpace: 'pre-wrap', fontWeight: 400 }}>{item.description}</div>}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>{item.quantity} {item.unit || item.product?.unit || ''}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', color: '#475569' }}>{formatMoney(item.unitPrice)}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#475569' }}>{item.taxRate || 0}%</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{formatMoney(item.totalPrice)}</td>
                                                    </tr>
                                                ))
                                            )}
                                            {order.items?.length > 0 && (
                                                <>
                                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                                        <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>Tổng tiền trước thuế:</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(order.subTotal || 0)}</td>
                                                    </tr>
                                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                                        <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>Tổng tiền thuế:</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 500, color: '#1e293b' }}>{formatMoney(order.taxAmount || 0)}</td>
                                                    </tr>
                                                    <tr style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                        <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>Tổng Cộng:</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>{formatMoney(order.totalAmount)}</td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Signatures Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#10b981" /> Chữ ký xác nhận
                        </h2>
                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'nowrap', gap: '2rem' }}>
                            <DocumentSignatureBlock 
                                entityType="SALES_ORDER" 
                                entityId={order.id} 
                                role="CUSTOMER" 
                                title="ĐẠI DIỆN KHÁCH HÀNG" 
                                subtitle="(Khách hàng ký qua link public)" 
                                canSign={false} 
                                initialSignature={order.customerSignature} 
                                initialSignedAt={order.customerSignedAt}
                            metadata={{
                                ip: order.customerSignIP,
                                device: order.customerSignDevice,
                                location: order.customerSignLocation
                            }} 
                            />
                            <DocumentSignatureBlock 
                                entityType="SALES_ORDER" 
                                entityId={order.id} 
                                role="COMPANY" 
                                title="NGƯỜI LẬP ĐƠN HÀNG" 
                                subtitle="(Ký xác nhận nội bộ)" 
                                canSign={true} 
                                initialSignature={order.companySignature} 
                                initialSignedAt={order.companySignedAt} 
                                signerName={order.creator?.name} 
                                companySignerId={session?.user?.id}
                            />
                        </div>
                    </div>

                </div>

                {/* Right Column: Related Tasks */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <TaskPanel
                        initialTasks={order.tasks || []}
                        users={users || []}
                        entityType="SALES_ORDER"
                        entityId={order.id}
                    />
                </div>
            </div>
            {/* Convert Modal */}
            <Modal isOpen={isConvertModalOpen} onClose={() => !isConverting && setIsConvertModalOpen(false)} title="Xác nhận Lên Hóa Đơn">
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <p className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        Bạn có chắc chắn muốn chuyển dữ liệu từ Đơn Đặt Hàng này thành <strong>Hóa Đơn</strong> không? Các thông tin chi tiết sẽ được tự động sao chép sang Hóa Đơn mới.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem', padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '9999px', color: '#3b82f6', flexShrink: 0, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                            <ArrowRightLeft size={20} />
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1e3a8a', lineHeight: 1.625, marginTop: '0.125rem' }}>
                            <strong style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Cập nhật tự động</strong>
                            Đơn đặt hàng này sẽ tự động chuyển thành trạng thái <strong style={{ backgroundColor: '#dbeafe', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', color: '#1d4ed8', fontWeight: 700 }}>"Hoàn Thành"</strong> sau quá trình khởi tạo thành công.
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => setIsConvertModalOpen(false)}
                            className="btn btn-secondary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px' }}
                            disabled={isConverting}
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            onClick={handleConfirmConvert}
                            className="btn btn-primary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px', minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={isConverting}
                        >
                            {isConverting ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>Xác Nhận Lên Hóa Đơn</>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Generic Action Modal */}
            <Modal isOpen={!!actionModal?.isOpen} onClose={() => !isActioning && setActionModal(null)} title={actionModal?.title || 'Xác nhận'}>
                <div className="p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <div className="text-gray-700 text-[15px] mb-6 leading-relaxed">
                        {actionModal?.message}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f3f4f6' }}>
                        <button
                            onClick={() => setActionModal(null)}
                            className="btn btn-secondary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px' }}
                            disabled={isActioning}
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            onClick={async () => {
                                if (!actionModal) return;
                                setIsActioning(true);
                                try {
                                    await actionModal.action();
                                    setActionModal(null);
                                } finally {
                                    setIsActioning(false);
                                }
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.625rem 1.5rem', fontSize: '15px', minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={isActioning}
                        >
                            {isActioning ? (
                                <>
                                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>Xác Nhận</>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                moduleType="ESTIMATE" // For now, we reuse ESTIMATE templates or create ORDER templates.
                defaultToEmail={order.customer?.email || ''}
                variablesData={{
                    customerName: order.customer?.name || '',
                    customerEmail: order.customer?.email || '',
                    senderName: order.creator?.name || '',
                    today: new Date().toLocaleDateString('vi-VN'),
                    code: order.code,
                    totalAmount: formatMoney(order.totalAmount),
                    link: `${window.location.origin}/public/sales/order/${order.id}`
                }}
                templates={emailTemplates || []}
                printUrl={`${window.location.origin}/public/sales/order/${order.id}`}
                documentName={`DonHang_${order.code}.pdf`}
                onSend={async (data) => {
                    const res = await sendOrderEmail(order.id, data.to, data.subject, data.htmlBody, data.attachmentName, data.attachmentBase64);
                    if (res.success) {
                        alert('Đã gửi email thành công!');
                        router.refresh();
                    } else {
                        throw new Error(res.error);
                    }
                }}
            />
        </div>
    );
}

