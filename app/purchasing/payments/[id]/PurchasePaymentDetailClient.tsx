'use client';
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, CheckSquare, Building, CreditCard, Link as LinkIcon, Paperclip, Upload, X, CheckCircle2, ExternalLink, Copy } from 'lucide-react';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import Link from 'next/link';
import { uploadPurchasePaymentDocument } from '@/app/purchasing/actions';

export function PurchasePaymentDetailClient({ payment, tasks, users }: { payment: any, tasks: any[], users: any[] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'allocations' | 'tasks'>('allocations');
    const [isUploading, setIsUploading] = useState(false);
    const [localPayment, setLocalPayment] = useState(payment);
    const [copied, setCopied] = useState(false);

    const handleCopyPublicLink = () => {
        const publicUrl = `${window.location.origin}/public/purchasing/payments/${payment.id}`;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Derived documents list
    const documents = React.useMemo(() => {
        if (!localPayment.attachment) return [];
        try {
            return JSON.parse(localPayment.attachment);
        } catch (e) {
            // Fallback for old single string attachment
            return [{ url: localPayment.attachment, name: 'Chứng từ gốc', uploadedAt: localPayment.createdAt }];
        }
    }, [localPayment.attachment]);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };


    const tabs = [
        { id: 'allocations', label: 'Cấn trừ Hóa Đơn', icon: <LinkIcon size={18} />, count: localPayment.allocations?.length || 0 },
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
                                Phiếu Chi {localPayment.code}
                            </h1>
                            <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-medium">Đã Thanh Toán</span>
                        </div>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '0.875rem' }}>Chi tiết lệnh chuyển tiền/chi tiền mặt cho nhà cung cấp.</p>
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
                        href={`/public/purchasing/payments/${payment.id}`}
                        target="_blank"
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#f1f5f9', color: '#3b82f6', border: '1px solid #bfdbfe', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    >
                        <ExternalLink size={16} /> Xem Bản In
                    </Link>
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
                                    <Link href={`/suppliers/${localPayment.supplierId}`} style={{ fontWeight: 600, color: '#4f46e5', textDecoration: 'none', fontSize: '1rem' }} className="hover:underline">
                                        {localPayment.supplier?.name}
                                    </Link>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Ngày Thanh Toán</p>
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
                                <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Tổng Số Tiền Chi</p>
                                <p style={{ margin: 0, fontWeight: 700, color: '#10b981', fontSize: '1.25rem' }}>{formatMoney(localPayment.amount)}</p>
                            </div>

                            {localPayment.notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Nội Dung / Lý Do Chi</p>
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
                                                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Dữ liệu cấn trừ trống (Tiền thừa / Nợ trước).</td></tr>
                                            ) : (
                                                localPayment.allocations?.map((allocation: any) => (
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
                                    Xin vui lòng xem cột Công việc bên phải.
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
                                entityType="PURCHASE_PAYMENT"
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
                                                <a href={doc.url} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', padding: '0.25rem' }}>Xem</a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', marginBottom: '1.5rem' }}>Chưa có tài liệu đính kèm.</p>
                                )}

                                <div style={{ position: 'relative' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.75rem', borderRadius: '0.5rem', border: '1px dashed #cbd5e1', cursor: isUploading ? 'not-allowed' : 'pointer', fontWeight: 500, transition: 'all 0.2s', width: '100%' }}>
                                        <Upload size={18} />
                                        {isUploading ? 'Đang tải lên...' : 'Tải lên tài liệu mới'}
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
                                                    const updatedPayment = await uploadPurchasePaymentDocument(localPayment.id, data.url, file.name);
                                                    setLocalPayment(updatedPayment);

                                                } catch (err: any) {
                                                    alert(err.message || 'Lỗi tải tệp tin');
                                                } finally {
                                                    setIsUploading(false);
                                                    e.target.value = '';
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
        </div >
    );
}
