'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Activity, Clock, User as UserIcon, CheckCircle2, FileEdit, PlusCircle, ArrowRightLeft, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from '@/app/components/ui/Modal';

interface ActivityLogProps {
    logs: any[];
}

export function SalesEstimateActivityLog({ logs }: ActivityLogProps) {
    const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);

    const displayLogs = logs?.slice(0, 5) || [];

    const toggleLogDetails = (id: string) => {
        setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (!logs || logs.length === 0) {
        return (
            <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                <Activity size={24} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Chưa có lịch sử làm việc nào.</p>
            </div>
        );
    }

    const getIconForAction = (action: string) => {
        switch (action) {
            case 'CREATED': return <PlusCircle size={16} color="#3b82f6" />;
            case 'UPDATED': return <FileEdit size={16} color="#f59e0b" />;
            case 'STATUS_CHANGED': return <ArrowRightLeft size={16} color="#8b5cf6" />;
            case 'CONVERTED': return <CheckCircle2 size={16} color="#10b981" />;
            case 'DELETED': return <XCircle size={16} color="#ef4444" />;
            default: return <Activity size={16} color="#64748b" />;
        }
    };

    const renderActionText = (action: string, details?: string, logId?: string) => {
        if (action === 'STATUS_CHANGED' && details) {
            try {
                const parsed = JSON.parse(details);
                const statusMap: Record<string, string> = {
                    'DRAFT': 'Bản Dự Thảo',
                    'SENT': 'Đã Gửi KH',
                    'ACCEPTED': 'Khách Chốt',
                    'ORDERED': 'Đã Lên Đơn',
                    'INVOICED': 'Đã Lên Hóa Đơn',
                    'REJECTED': 'Từ Chối'
                };
                return <span>Chuyển trạng thái sang: <strong>{statusMap[parsed.to] || parsed.to}</strong></span>;
            } catch (e) {
                return <span>{details}</span>;
            }
        }

        if (action === 'UPDATED' && details) {
            try {
                const parsed = JSON.parse(details);
                if (parsed.diffs && Array.isArray(parsed.diffs)) {
                    const isExpanded = logId ? expandedLogs[logId] : false;
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span>Cập nhật nội dung Báo giá</span>
                                <button
                                    onClick={() => logId && toggleLogDetails(logId)}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem',
                                        fontSize: '0.75rem', color: '#4f46e5', backgroundColor: '#e0e7ff', borderRadius: '0.375rem',
                                        border: 'none', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s'
                                    }}
                                >
                                    {isExpanded ? (
                                        <><ChevronUp size={14} /> Ẩn bớt</>
                                    ) : (
                                        <><ChevronDown size={14} /> Chi tiết</>
                                    )}
                                </button>
                            </div>

                            {isExpanded && (
                                <div style={{
                                    marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'white',
                                    border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#475569'
                                }}>
                                    <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                        {parsed.diffs.map((diff: string, i: number) => (
                                            <li key={i} dangerouslySetInnerHTML={{
                                                // Thay thế Markdown-style **bold** text thành <strong> HTML nội bộ list
                                                __html: diff.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 600;">$1</strong>')
                                            }} />
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                }
            } catch (e) {
                // Ignore parse errors, fallback to default behavior
            }
        }

        if (action === 'CONVERTED') return <span>{details}</span>;
        if (details && !details.startsWith('{')) return <span>{details}</span>;

        switch (action) {
            case 'CREATED': return <span>Tạo Báo giá mới</span>;
            case 'UPDATED': return <span>Cập nhật nội dung Báo giá</span>;
            default: return <span>{action}</span>;
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="#64748b" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Lịch sử làm việc</h3>
            </div>
            <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
                    {/* Vertical line for timeline */}
                    <div style={{ position: 'absolute', top: '1rem', bottom: '1rem', left: '1.125rem', width: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }}></div>

                    {displayLogs.map((log: any, index: number) => (
                        <div key={log.id} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1, alignItems: 'flex-start' }}>
                            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', backgroundColor: 'white', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }}>
                                {getIconForAction(log.action)}
                            </div>
                            <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem', gap: '1rem' }}>
                                    <div style={{ margin: 0, fontWeight: 500, color: '#1e293b', fontSize: '0.9rem', flex: 1 }}>
                                        {renderActionText(log.action, log.details, log.id)}
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', flexShrink: 0, gap: '0.25rem' }}>
                                        <Clock size={12} />
                                        {format(new Date(log.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                                    <UserIcon size={14} />
                                    <span>{log.user?.name || 'Ai đó'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {(logs && logs.length > 5) && (
                <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', width: '100%' }}
                        className="hover:text-blue-700 hover:underline"
                    >
                        Xem toàn bộ lịch sử xung quanh ({logs.length} thao tác)
                    </button>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Lịch Sử Báo Giá Bán Hàng">
                <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
                        {/* Vertical line for timeline */}
                        <div style={{ position: 'absolute', top: '1rem', bottom: '1rem', left: '1.125rem', width: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }}></div>

                        {logs?.map((log: any, index: number) => (
                            <div key={log.id} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1, alignItems: 'flex-start' }}>
                                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', backgroundColor: 'white', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }}>
                                    {getIconForAction(log.action)}
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem', gap: '1rem' }}>
                                        <div style={{ margin: 0, fontWeight: 500, color: '#1e293b', fontSize: '0.9rem', flex: 1 }}>
                                            {renderActionText(log.action, log.details, log.id)}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', flexShrink: 0, gap: '0.25rem' }}>
                                            <Clock size={12} />
                                            {format(new Date(log.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                                        <UserIcon size={14} />
                                        <span>{log.user?.name || 'Ai đó'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
