'use client';
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Building, Phone, Mail, FileText,
    ShoppingCart, FileDown, Wallet, DollarSign,
    CheckSquare, MapPin, Search, Edit2, FileSpreadsheet
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { updateSupplier } from '@/app/purchasing/actions';
import { SupplierStatementPanel } from '@/app/components/suppliers/SupplierStatementPanel';

export function SupplierDetailClient({ supplier: initialSupplier, users, tasks }: { supplier: any, users: any[], tasks: any[] }) {
    const router = useRouter();
    const [supplier, setSupplier] = useState(initialSupplier);
    const [activeTab, setActiveTab] = useState('orders');

    const validBills = React.useMemo(() => supplier.bills ? supplier.bills.filter((b: any) => !['DRAFT', 'CANCELLED'].includes(b.status)) : [], [supplier.bills]);
    const computedDebt = React.useMemo(() => {
        const exactPurchases = validBills.reduce((acc: number, bill: any) => acc + (bill.totalAmount || 0), 0);
        const exactPayments = (supplier.payments || []).reduce((acc: number, pay: any) => acc + (pay.amount || 0), 0);
        return exactPurchases - exactPayments;
    }, [validBills, supplier.payments]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        code: supplier.code || '',
        name: supplier.name || '',
        contactName: supplier.contactName || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        taxCode: supplier.taxCode || '',
        website: supplier.website || '',
        businessType: supplier.businessType || '',
        bankAccount: supplier.bankAccount || '',
        bankName: supplier.bankName || '',
        notes: supplier.notes || ''
    });

    const handleOpenEdit = () => {
        setFormData({
            code: supplier.code || '',
            name: supplier.name || '',
            contactName: supplier.contactName || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            taxCode: supplier.taxCode || '',
            website: supplier.website || '',
            businessType: supplier.businessType || '',
            bankAccount: supplier.bankAccount || '',
            bankName: supplier.bankName || '',
            notes: supplier.notes || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const updated = await updateSupplier(supplier.id, formData);
            setSupplier({ ...updated, orders: supplier.orders, bills: supplier.bills, payments: supplier.payments });
            setIsEditModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra khi cập nhật!");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };


    const tabs = [
        { id: 'orders', label: 'Đơn Đặt Hàng', count: supplier.orders?.length || 0, icon: <ShoppingCart size={16} /> },
        { id: 'bills', label: 'Hóa Đơn', count: supplier.bills?.length || 0, icon: <FileDown size={16} /> },
        { id: 'payments', label: 'Thanh Toán', count: supplier.payments?.length || 0, icon: <Wallet size={16} /> },
        { id: 'debt', label: 'Tổng Công Nợ', count: null, icon: <DollarSign size={16} /> },
        { id: 'statement', label: 'Sao Kê Công Nợ', count: '-', icon: <FileSpreadsheet size={16} /> },
    ];

    const getStatusBadge = (status: string, type: 'order' | 'bill') => {
        let text = status;
        let color = '#6b7280';
        let bg = '#f3f4f6';

        if (type === 'order') {
            switch (status) {
                case 'DRAFT': text = 'Nháp'; break;
                case 'SENT': text = 'Đã Gửi'; color = '#1d4ed8'; bg = '#dbeafe'; break;
                case 'COMPLETED': text = 'Hoàn Thành'; color = '#15803d'; bg = '#dcfce7'; break;
            }
        } else {
            switch (status) {
                case 'DRAFT': text = 'Nháp'; break;
                case 'APPROVED': text = 'Đã Duyệt (Nợ)'; color = '#1d4ed8'; bg = '#dbeafe'; break;
                case 'PARTIAL_PAID': text = 'Đã Trả 1 Phần'; color = '#b45309'; bg = '#fef3c7'; break;
                case 'PAID': text = 'Đã Thanh Toán'; color = '#15803d'; bg = '#dcfce7'; break;
            }
        }

        return <span style={{ padding: '0.25rem 0.75rem', border: `1px solid ${bg === '#f3f4f6' ? '#e5e7eb' : bg}`, borderRadius: '1rem', fontSize: '0.75rem', backgroundColor: bg === '#fef3c7' ? 'transparent' : bg === '#dbeafe' ? '#eff6ff' : bg, color: color, fontWeight: 500 }}>{text}</span>;
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '100%', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => router.push('/suppliers')} style={{ padding: '0.5rem', borderRadius: '50%', background: 'white', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#111827' }}>Chi tiết Nhà cung cấp</h1>
                        <p style={{ color: '#6b7280', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>Quản lý thông tin và tài liệu liên kết.</p>
                    </div>
                </div>
                <button onClick={handleOpenEdit} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: 500, cursor: 'pointer' }}>
                    <Edit2 size={16} /> Chỉnh sửa
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Top Info Card */}
                    <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '0.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', border: '1px solid #e5e7eb' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '0.5rem', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', flexShrink: 0 }}>
                            <Building size={32} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 1rem 0', color: '#111827' }}>{supplier.name}</h2>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#6b7280' }}><Mail size={16} /></div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Email</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{supplier.email || '--'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#6b7280' }}><Phone size={16} /></div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Số Điện Thoại</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{supplier.phone || '--'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#6b7280' }}><FileText size={16} /></div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Mã Số Thuế</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{supplier.taxCode || '--'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#6b7280' }}><MapPin size={16} /></div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Địa Chỉ</span>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{supplier.address || '--'}</span>
                                    </div>
                                </div>
                                {supplier.website && (
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#6b7280' }}><Building size={16} /></div>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Website</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{supplier.website || '--'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs area */}
                    <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', overflowX: 'auto', padding: '0 1rem' }}>
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{
                                            display: 'flex', gap: '0.5rem', alignItems: 'center',
                                            padding: '1rem 1.5rem', border: 'none', background: 'transparent',
                                            cursor: 'pointer', fontSize: '0.875rem', fontWeight: isActive ? 600 : 500,
                                            color: isActive ? '#4f46e5' : '#6b7280',
                                            borderBottom: isActive ? '2px solid #4f46e5' : '2px solid transparent',
                                            whiteSpace: 'nowrap', transition: 'all 0.2s', position: 'relative'
                                        }}
                                    >
                                        <span style={{ color: isActive ? '#4f46e5' : '#9ca3af' }}>{tab.icon}</span>
                                        {tab.label}
                                        {tab.count !== null && (
                                            <span style={{
                                                backgroundColor: isActive ? '#e0e7ff' : '#f3f4f6',
                                                color: isActive ? '#4f46e5' : '#6b7280',
                                                padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600
                                            }}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content Header */}
                        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Danh sách hồ sơ</h3>
                            {activeTab === 'orders' && <Link href={`/purchasing/orders?supplierId=${supplier.id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>+ Tạo Đơn Hàng</Link>}
                            {activeTab === 'bills' && <Link href={`/purchasing/bills?supplierId=${supplier.id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>+ Tạo Hóa Đơn</Link>}
                            {activeTab === 'payments' && <Link href={`/purchasing/payments?supplierId=${supplier.id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>+ Tạo Phiếu Chi</Link>}
                        </div>

                        {/* Tab Content Grid */}
                        <div style={{ padding: '1rem 1.5rem' }}>
                            {activeTab === 'orders' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <thead style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <tr>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Mã HS</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Tiêu đề</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Trạng thái</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Ngày tạo</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplier.orders?.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Không có dữ liệu.</td></tr>}
                                        {supplier.orders?.map((order: any) => (
                                            <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '1rem 0', fontWeight: 500 }}>
                                                    <Link href={`/purchasing/orders/${order.id}`} className="hover:text-primary transition-colors text-gray-500">{order.code}</Link>
                                                </td>
                                                <td style={{ padding: '1rem 0', fontWeight: 500 }}>
                                                    <Link href={`/purchasing/orders/${order.id}`} className="hover:text-primary transition-colors text-gray-900">Đơn hàng {order.code} - {formatMoney(order.totalAmount)}</Link>
                                                </td>
                                                <td style={{ padding: '1rem 0' }}>{getStatusBadge(order.status, 'order')}</td>
                                                <td style={{ padding: '1rem 0', color: '#4b5563' }}>{formatDate(order.date)}</td>
                                                <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                                                    <Link href={`/purchasing/orders/${order.id}`} style={{ display: 'inline-block', border: 'none', background: '#e0e7ff', color: '#4f46e5', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer' }}>
                                                        <Search size={16} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'bills' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <thead style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <tr>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Mã HS</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Tiêu đề</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Trạng thái</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Thẻ Quản Lý</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Ngày tạo</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplier.bills?.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Không có dữ liệu.</td></tr>}
                                        {supplier.bills?.map((bill: any) => (
                                            <tr key={bill.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '1rem 0', fontWeight: 500 }}>
                                                    <Link href={`/purchasing/bills/${bill.id}`} className="hover:text-primary transition-colors text-gray-500">{bill.code}</Link>
                                                </td>
                                                <td style={{ padding: '1rem 0', fontWeight: 500 }}>
                                                    <Link href={`/purchasing/bills/${bill.id}`} className="hover:text-primary transition-colors text-gray-900">Hóa đơn {bill.supplierInvoice || bill.code} - {formatMoney(bill.totalAmount)}</Link>
                                                </td>
                                                <td style={{ padding: '1rem 0' }}>{getStatusBadge(bill.status, 'bill')}</td>
                                                <td style={{ padding: '1rem 0' }}>
                                                    {bill.tags ? (
                                                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                                            {bill.tags.split(',').map((tag: string, i: number) => (
                                                                <span key={i} style={{
                                                                    padding: '0.125rem 0.5rem',
                                                                    fontSize: '0.7rem',
                                                                    backgroundColor: '#f1f5f9',
                                                                    color: '#475569',
                                                                    borderRadius: '0.25rem',
                                                                    border: '1px solid #e2e8f0',
                                                                    fontWeight: 500
                                                                }}>
                                                                    {tag.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>--</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 0', color: '#4b5563' }}>{formatDate(bill.date)}</td>
                                                <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                                                    <Link href={`/purchasing/bills/${bill.id}`} style={{ display: 'inline-block', border: 'none', background: '#e0e7ff', color: '#4f46e5', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer' }}>
                                                        <Search size={16} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'payments' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <thead style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <tr>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Mã HS</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Tiêu đề</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Thanh Toán</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600 }}>Ngày tạo</th>
                                            <th style={{ padding: '1rem 0', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {supplier.payments?.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>Không có dữ liệu.</td></tr>}
                                        {supplier.payments?.map((payment: any) => (
                                            <tr key={payment.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '1rem 0', fontWeight: 500 }}>
                                                    <Link href={`/purchasing/payments/${payment.id}`} className="hover:text-primary transition-colors text-gray-500">{payment.code}</Link>
                                                </td>
                                                <td style={{ padding: '1rem 0', fontWeight: 500 }}>
                                                    <Link href={`/purchasing/payments/${payment.id}`} className="hover:text-primary transition-colors text-gray-900">Phiếu chi {payment.code}</Link>
                                                </td>
                                                <td style={{ padding: '1rem 0', fontWeight: 600, color: '#16a34a' }}>{formatMoney(payment.amount)}</td>
                                                <td style={{ padding: '1rem 0', color: '#4b5563' }}>{formatDate(payment.date)}</td>
                                                <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                                                    <Link href={`/purchasing/payments/${payment.id}`} style={{ display: 'inline-block', border: 'none', background: '#e0e7ff', color: '#4f46e5', padding: '0.4rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer' }}>
                                                        <Search size={16} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'debt' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', padding: '1rem 0 2rem' }}>
                                    <div style={{ padding: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', marginBottom: '0.5rem' }}>
                                            <FileDown size={18} /> <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Tổng Giá Trị Hóa Đơn</span>
                                        </div>
                                        <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>
                                            {formatMoney(validBills.reduce((sum: number, bill: any) => sum + (bill.totalAmount || 0), 0))}
                                        </span>
                                    </div>
                                    <div style={{ padding: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', marginBottom: '0.5rem' }}>
                                            <Wallet size={18} /> <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Tổng Đã Thanh Toán</span>
                                        </div>
                                        <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>
                                            {formatMoney(supplier.payments?.reduce((sum: number, pay: any) => sum + pay.amount, 0) || 0)}
                                        </span>
                                    </div>
                                    <div style={{ padding: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', marginBottom: '0.5rem' }}>
                                            <DollarSign size={18} /> <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Công Nợ Hiện Tại</span>
                                        </div>
                                        <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                                            {formatMoney(computedDebt)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'statement' && (
                                <div style={{ paddingTop: '1rem' }}>
                                    <SupplierStatementPanel supplierId={supplier.id} supplierName={supplier.name} />
                                </div>
                            )}

                            {supplier.notes && (
                                <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px dashed #e5e7eb' }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Ghi chú</h4>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'pre-wrap', margin: 0 }}>{supplier.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Tasks Box */}
                <div style={{ position: 'sticky', top: '1rem' }}>
                    <TaskPanel initialTasks={tasks} users={users} entityType="SUPPLIER" entityId={supplier.id} />
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-container" style={{ maxWidth: '800px', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                                Chỉnh sửa Nhà Cung Cấp
                            </h2>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                            <form id="supplierEditForm" onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Thông tin chung */}
                                <div>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Thông Tin Chung</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Mã NCC</label>
                                            <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="input w-full" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Tên Nhà Cung Cấp <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input w-full" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Mã Số Thuế</label>
                                            <input type="text" value={formData.taxCode} onChange={e => setFormData({ ...formData, taxCode: e.target.value })} className="input w-full" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Loại Hình Kinh Doanh</label>
                                            <input type="text" value={formData.businessType} onChange={e => setFormData({ ...formData, businessType: e.target.value })} className="input w-full" />
                                        </div>
                                    </div>
                                </div>

                                {/* Thông tin liên hệ */}
                                <div>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Thông Tin Liên Hệ</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Người Liên Hệ</label>
                                            <input type="text" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} className="input w-full" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Số Điện Thoại</label>
                                            <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input w-full" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Email</label>
                                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input w-full" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Hồ Sơ Năng Lực / Website</label>
                                            <input type="text" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} className="input w-full" />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Địa Chỉ</label>
                                            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input w-full" />
                                        </div>
                                    </div>
                                </div>

                                {/* Thông tin thanh toán & Ghi chú */}
                                <div>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Thông Tin Thanh Toán & Ghi Chú</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Ngân Hàng / Chi Nhánh</label>
                                            <input type="text" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} className="input w-full" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Số Tài Khoản</label>
                                            <input type="text" value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} className="input w-full" />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Ghi Chú Nội Bộ</label>
                                            <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input w-full" style={{ resize: 'vertical' }} />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', background: 'var(--surface)' }}>
                            <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn" style={{ border: '1px solid var(--border)', background: '#fff' }}>Hủy</button>
                            <button type="submit" form="supplierEditForm" disabled={isSubmitting} className="btn btn-primary" style={{ background: 'var(--primary)', color: '#fff', opacity: isSubmitting ? 0.7 : 1 }}>
                                {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

