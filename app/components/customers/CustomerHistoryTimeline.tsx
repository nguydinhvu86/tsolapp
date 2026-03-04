'use client'

import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Activity, Edit, FileText, FileSignature, FileArchive, CheckCircle, CreditCard, Clock, MessageSquare, Plus, User, FileClock } from 'lucide-react';
import { Modal } from '@/app/components/ui/Modal';

interface CustomerActivityLog {
    id: string;
    action: string;
    details: string | null;
    createdAt: Date;
    user: { name: string | null; avatar: string | null };
}

interface CustomerHistoryTimelineProps {
    logs: CustomerActivityLog[];
}

export function CustomerHistoryTimeline({ logs }: CustomerHistoryTimelineProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const displayLogs = logs?.slice(0, 5) || [];

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'TẠO_MỚI': return <Plus size={16} color="#3b82f6" />;
            case 'CẬP_NHẬT_THÔNG_TIN': return <Edit size={16} color="#f59e0b" />;
            case 'CẬP_NHẬT': return <Edit size={16} color="#f59e0b" />;
            case 'THÊM_GHI_CHÚ': return <MessageSquare size={16} color="#10b981" />;
            case 'XÓA_GHI_CHÚ': return <MessageSquare size={16} color="#ef4444" />;
            case 'TẠO_BÁO_GIÁ': return <FileText size={16} color="#8b5cf6" />;
            case 'TẠO_HỢP_ĐỒNG': return <FileSignature size={16} color="#0ea5e9" />;
            case 'TẠO_HÓA_ĐƠN': return <FileArchive size={16} color="#f43f5e" />;
            case 'NHẬN_THANH_TOÁN': return <CreditCard size={16} color="#22c55e" />;
            case 'CẬP_NHẬT_TRẠNG_THÁI': return <CheckCircle size={16} color="#14b8a6" />;
            default: return <Activity size={16} color="#64748b" />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'TẠO_MỚI': return '#eff6ff';
            case 'CẬP_NHẬT_THÔNG_TIN': return '#fffbeb';
            case 'CẬP_NHẬT': return '#fffbeb';
            case 'THÊM_GHI_CHÚ': return '#ecfdf5';
            case 'XÓA_GHI_CHÚ': return '#fef2f2';
            case 'TẠO_BÁO_GIÁ': return '#f5f3ff';
            case 'TẠO_HỢP_ĐỒNG': return '#f0f9ff';
            case 'TẠO_HÓA_ĐƠN': return '#fff1f2';
            case 'NHẬN_THANH_TOÁN': return '#f0fdf4';
            case 'CẬP_NHẬT_TRẠNG_THÁI': return '#f0fdfa';
            default: return '#f8fafc';
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="#64748b" />
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>Lịch Sử Khách Hàng</h3>
            </div>
            <div style={{ padding: '1.25rem' }}>
                {(!logs || logs.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8' }}>
                        <Activity size={28} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>Chưa có hoạt động nào được ghi nhận.</p>
                    </div>
                ) : (
                    <div style={{ position: 'relative', paddingLeft: '0.5rem' }}>
                        {/* Vertical Line */}
                        <div style={{ position: 'absolute', left: '1.625rem', top: '0', bottom: '0', width: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }}></div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                            {displayLogs.map((log) => (
                                <div key={log.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: '2.25rem', height: '2.25rem',
                                        borderRadius: '50%', backgroundColor: getActionColor(log.action),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid #e2e8f0',
                                        zIndex: 2
                                    }}>
                                        {getActionIcon(log.action)}
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                                                {log.details || log.action}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <User size={12} /> {log.user?.name || 'Hệ thống'}
                                            </span>
                                            <span>{format(new Date(log.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {(logs && logs.length > 5) && (
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', width: '100%' }}
                        className="hover:text-blue-700 hover:underline"
                    >
                        Xem toàn bộ lịch sử xung quanh ({logs.length} thao tác)
                    </button>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Toàn Bộ Lịch Sử Khách Hàng">
                <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                    <div style={{ position: 'relative', paddingLeft: '0.5rem' }}>
                        <div style={{ position: 'absolute', left: '1.625rem', top: '0', bottom: '0', width: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                            {logs?.map((log) => (
                                <div key={log.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: '2.25rem', height: '2.25rem',
                                        borderRadius: '50%', backgroundColor: getActionColor(log.action),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                        border: '1px solid #e2e8f0',
                                        zIndex: 2
                                    }}>
                                        {getActionIcon(log.action)}
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                                                {log.details || log.action}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <User size={12} /> {log.user?.name || 'Hệ thống'}
                                            </span>
                                            <span>{format(new Date(log.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
