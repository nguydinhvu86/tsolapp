'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, CheckSquare, Building, CreditCard, Link as LinkIcon } from 'lucide-react';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import Link from 'next/link';

export function PurchasePaymentDetailClient({ payment, tasks, users }: { payment: any, tasks: any[], users: any[] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'allocations' | 'tasks'>('allocations');

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString: string | Date | null) => {
        if (!dateString) return '--';
        return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const tabs = [
        { id: 'allocations', label: 'Cấn trừ Hóa Đơn', icon: <LinkIcon size={18} />, count: payment.allocations?.length || 0 },
        { id: 'tasks', label: 'Công việc', icon: <CheckSquare size={18} />, count: tasks.length },
    ] as const;

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
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
                                Phiếu Chi {payment.code}
                            </h1>
                            <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">Đã Thanh Toán</span>
                        </div>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Chi tiết lệnh chuyển tiền/chi tiền mặt cho nhà cung cấp.</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 3fr)', gap: '2rem' }}>
                {/* Left Column: Details & Tabs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Summary Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#6366f1" /> Thông tin Phiếu Chi
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Người Nhận (Nhà Cung Cấp)</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Building size={16} color="#64748b" />
                                    <Link href={`/suppliers/${payment.supplierId}`} style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none', fontSize: '1rem' }} className="hover:underline">
                                        {payment.supplier?.name}
                                    </Link>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Ngày Thanh Toán</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155', fontWeight: 500 }}>
                                    <Calendar size={16} color="#64748b" />
                                    {formatDate(payment.date)}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Hình Thức & Tham Chiếu</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <div>
                                        {payment.paymentMethod === 'BANK_TRANSFER' ? (
                                            <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-medium border border-blue-200">Chuyển Khoản</span>
                                        ) : (
                                            <span className="px-2 py-1 rounded bg-amber-50 text-amber-600 text-xs font-medium border border-amber-200">Tiền Mặt</span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tham chiếu: {payment.reference || 'Không có'}</span>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Tổng Số Tiền Chi</p>
                                <p style={{ margin: 0, fontWeight: 700, color: '#10b981', fontSize: '1.25rem' }}>{formatMoney(payment.amount)}</p>
                            </div>

                            {payment.notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Nội Dung / Lý Do Chi</p>
                                    <p style={{ margin: 0, color: '#475569', fontSize: '0.875rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>{payment.notes}</p>
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
                                            {payment.allocations?.length === 0 ? (
                                                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Dữ liệu cấn trừ trống (Tiền thừa / Nợ trước).</td></tr>
                                            ) : (
                                                payment.allocations?.map((allocation: any) => (
                                                    <tr key={allocation.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '1rem' }}>
                                                            <Link href={`/purchasing/bills/${allocation.bill?.id}`} style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }} className="hover:underline">
                                                                {allocation.bill?.code}
                                                            </Link>
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            {allocation.bill?.status === 'PAID' ? (
                                                                <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">Đã Thanh Toán Hết</span>
                                                            ) : (
                                                                <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-semibold">Còn Nợ Lại</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatMoney(allocation.amount)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        {payment.allocations?.length > 0 && (
                                            <tfoot>
                                                <tr style={{ backgroundColor: '#f8fafc' }}>
                                                    <td colSpan={2} style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>Tổng Phân Bổ:</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                                                        {formatMoney(payment.allocations.reduce((acc: number, cur: any) => acc + cur.amount, 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
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

                {/* Right Column: Tasks Panel */}
                <div>
                    <div style={{ position: 'sticky', top: '2rem' }}>
                        <TaskPanel
                            initialTasks={tasks}
                            users={users}
                            entityType="PURCHASE_PAYMENT"
                            entityId={payment.id}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
