'use client';

import React, { useState } from 'react';
import { resolveLeaveRequest } from '@/app/hr/attendance/actions';
import { Check, X } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';

export default function HrApprovalClient({ initialData }: { initialData: any[] }) {
    const [requests, setRequests] = useState(initialData);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleResolve = async (id: string, action: 'APPROVE' | 'REJECT') => {
        if (!confirm(`Xác nhận ${action === 'APPROVE' ? 'Duyệt' : 'Từ chối'} đơn này?`)) return;
        setLoadingId(id);
        const res = await resolveLeaveRequest(id, action);
        if (res.success) {
            setRequests(requests.filter(r => r.id !== id));
        } else {
            alert(res.error);
        }
        setLoadingId(null);
    };

    return (
        <Card>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="flex items-center gap-3">
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Danh Sách Chờ Duyệt</h2>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '0.125rem 0.5rem', borderRadius: '1rem' }}>
                        {requests.length} đơn
                    </span>
                </div>
            </div>

            <Table>
                <thead>
                    <tr>
                        <th style={{ minWidth: '200px' }}>Nhân viên</th>
                        <th>Loại Đơn</th>
                        <th style={{ minWidth: '150px' }}>Thời gian</th>
                        <th style={{ minWidth: '200px' }}>Lý do</th>
                        <th style={{ width: '180px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                <div className="flex flex-col items-center gap-2">
                                    <Check size={32} style={{ color: 'var(--success)' }} />
                                    <span>Không có đơn từ nào cần duyệt.</span>
                                </div>
                            </td>
                        </tr>
                    ) : requests.map(r => (
                        <tr key={r.id}>
                            <td>
                                <div className="flex items-center gap-2">
                                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                        {r.user?.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{r.user?.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.user?.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td style={{ fontWeight: 500 }}>
                                {r.type === 'SICK_LEAVE' ? 'Nghỉ Ốm' : r.type === 'UNPAID_LEAVE' ? 'Nghỉ Không Lương' : 'Nghỉ Phép Năm'}
                            </td>
                            <td>
                                <div style={{ fontSize: '0.875rem' }}>
                                    Từ: {new Date(r.startDate).toLocaleDateString('vi-VN')} <br />
                                    Đến: {new Date(r.endDate).toLocaleDateString('vi-VN')}
                                </div>
                            </td>
                            <td style={{ maxWidth: '250px' }}>
                                <div className="line-clamp-2" style={{ fontSize: '0.875rem' }} title={r.reason}>{r.reason}</div>
                            </td>
                            <td>
                                <div className="flex justify-center gap-2">
                                    <Button
                                        onClick={() => handleResolve(r.id, 'APPROVE')}
                                        disabled={loadingId === r.id}
                                        style={{ background: 'var(--success)', color: '#fff', borderColor: 'var(--success)' }}
                                        className="gap-1"
                                    >
                                        <Check size={16} /> Duyệt
                                    </Button>
                                    <Button
                                        onClick={() => handleResolve(r.id, 'REJECT')}
                                        disabled={loadingId === r.id}
                                        variant="danger"
                                        className="gap-1"
                                    >
                                        <X size={16} /> Từ chối
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Card>
    );
}
