'use client';

import React, { useState } from 'react';
import { createLeaveRequest } from '@/app/hr/attendance/actions';
import { Plus, Check, X, Clock } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';

export default function LeaveRequestClient({ initialData }: { initialData: any[] }) {
    const [requests, setRequests] = useState(initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form
    const [type, setType] = useState('ANNUAL_LEAVE');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate || !reason) return alert('Vui lòng điền đủ thông tin');

        setIsLoading(true);
        const res = await createLeaveRequest({
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason
        });

        if (res.success) {
            setRequests([res.data, ...requests]);
            setIsModalOpen(false);
            setStartDate('');
            setEndDate('');
            setReason('');
        } else {
            alert(res.error);
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="flex items-center gap-3">
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Lịch Sử Đơn Từ</h2>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '0.125rem 0.5rem', borderRadius: '1rem' }}>
                            {requests.length} đơn
                        </span>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                        <Plus size={18} /> Tạo Đơn Mới
                    </Button>
                </div>

                <Table>
                    <thead>
                        <tr>
                            <th>Loại Đơn</th>
                            <th>Từ Ngày</th>
                            <th>Đến Ngày</th>
                            <th>Lý do</th>
                            <th style={{ width: '150px' }}>Trạng Thái</th>
                            <th style={{ width: '120px' }}>Ngày Tạo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Chưa có đơn từ nào
                                </td>
                            </tr>
                        ) : requests.map(r => (
                            <tr key={r.id}>
                                <td style={{ fontWeight: 500 }}>
                                    {r.type === 'SICK_LEAVE' ? 'Nghỉ Ốm' : r.type === 'UNPAID_LEAVE' ? 'Nghỉ Không Lương' : 'Nghỉ Phép Năm'}
                                </td>
                                <td>{new Date(r.startDate).toLocaleDateString('vi-VN')}</td>
                                <td>{new Date(r.endDate).toLocaleDateString('vi-VN')}</td>
                                <td style={{ maxWidth: '300px' }}>
                                    <div className="truncate" title={r.reason}>{r.reason}</div>
                                </td>
                                <td>
                                    {r.status === 'PENDING' && <span className="p-1 px-2 rounded-full text-xs font-medium bg-amber-100 text-amber-800">ĐANG CHỜ</span>}
                                    {r.status === 'APPROVED' && <span className="p-1 px-2 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">ĐÃ DUYỆT</span>}
                                    {r.status === 'REJECTED' && <span className="p-1 px-2 rounded-full text-xs font-medium bg-rose-100 text-rose-800">TỪ CHỐI</span>}
                                </td>
                                <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => !isLoading && setIsModalOpen(false)} title="Tạo Đơn Xin Nghỉ">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Loại nghỉ phép <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <select value={type} onChange={e => setType(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-primary)', outline: 'none' }}>
                            <option value="ANNUAL_LEAVE">Nghỉ Phép Năm</option>
                            <option value="SICK_LEAVE">Nghỉ Ốm Đau</option>
                            <option value="UNPAID_LEAVE">Nghỉ Không Lương</option>
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input
                                label="Từ ngày *"
                                type="date"
                                required
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                label="Đến ngày *"
                                type="date"
                                required
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Lý do nghỉ <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <textarea required value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-primary)', outline: 'none', resize: 'vertical' }} placeholder="Trình bày lý do xin nghỉ chi tiết..."></textarea>
                    </div>

                    <div className="flex gap-2" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Đang gửi duyệt...' : 'Gửi Đơn Xin Nghỉ'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
