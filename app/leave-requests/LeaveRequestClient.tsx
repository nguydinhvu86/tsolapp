'use client';

import React, { useState } from 'react';
import { createLeaveRequest, updateLeaveRequest } from '@/app/hr/attendance/actions';
import { Plus, Check, X, Clock, Edit, FileImage, Eye } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';

export default function LeaveRequestClient({ initialData }: { initialData: any[] }) {
    const [requests, setRequests] = useState(initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [editId, setEditId] = useState<string | null>(null);
    const [requestStatus, setRequestStatus] = useState<string>('PENDING');
    const [type, setType] = useState('ANNUAL_LEAVE');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const [viewImage, setViewImage] = useState<string | null>(null);

    const openNewModal = () => {
        setEditId(null);
        setRequestStatus('PENDING');
        setType('ANNUAL_LEAVE');
        setStartDate('');
        setEndDate('');
        setReason('');
        setImageUrl('');
        setIsModalOpen(true);
    };

    const openEditModal = (r: any) => {
        setEditId(r.id);
        setRequestStatus(r.status);
        setType(r.type);
        setStartDate(new Date(r.startDate).toISOString().split('T')[0]);
        setEndDate(new Date(r.endDate).toISOString().split('T')[0]);
        setReason(r.reason);
        setImageUrl(r.imageUrl || '');
        setIsModalOpen(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate || !reason) return alert('Vui lòng điền đủ thông tin');

        setIsLoading(true);
        const payload = {
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason,
            imageUrl
        };

        let res;
        if (editId) {
            res = await updateLeaveRequest(editId, payload);
        } else {
            res = await createLeaveRequest(payload);
        }

        if (res.success) {
            if (editId) {
                setRequests(requests.map(r => r.id === editId ? res.data : r));
            } else {
                setRequests([res.data, ...requests]);
            }
            setIsModalOpen(false);
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
                    <Button onClick={openNewModal} className="gap-2">
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
                            <th style={{ width: '130px', textAlign: 'center' }}>Minh Chứng</th>
                            <th style={{ width: '180px' }}>Trạng Thái & Người Duyệt</th>
                            <th style={{ width: '120px' }}>Ngày Tạo</th>
                            <th style={{ width: '80px' }}></th>
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
                                <td style={{ textAlign: 'center' }}>
                                    {r.imageUrl ? (
                                        <button type="button" onClick={() => setViewImage(r.imageUrl)} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded border-none cursor-pointer">
                                            <FileImage size={14} /> Xem Ảnh
                                        </button>
                                    ) : <span className="text-slate-400 text-xs">-</span>}
                                </td>
                                <td>
                                    <div className="flex flex-col gap-1">
                                        {r.status === 'PENDING' && <span className="w-fit p-1 px-2 rounded-full text-xs font-medium bg-amber-100 text-amber-800">ĐANG CHỜ</span>}
                                        {r.status === 'APPROVED' && <span className="w-fit p-1 px-2 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">ĐÃ DUYỆT</span>}
                                        {r.status === 'REJECTED' && <span className="w-fit p-1 px-2 rounded-full text-xs font-medium bg-rose-100 text-rose-800">TỪ CHỐI</span>}

                                        {r.approver && r.status !== 'PENDING' && (
                                            <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                                                <span>Duyệt bởi: <strong>{r.approver.name}</strong></span>
                                                <span>Lúc: {new Date(r.updatedAt).toLocaleString('vi-VN')}</span>
                                            </div>
                                        )}
                                        {r.status === 'REJECTED' && r.approverNote && (
                                            <div className="text-[11px] text-rose-600 mt-1 italic border-l-2 border-rose-300 pl-1">
                                                Lý do: {r.approverNote}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                                <td>
                                    <Button variant="secondary" onClick={() => openEditModal(r)} style={{ padding: '0.25rem' }} title={r.status === 'PENDING' ? "Chỉnh sửa" : "Xem chi tiết"}>
                                        {r.status === 'PENDING' ? <Edit size={16} className="text-slate-500" /> : <Eye size={16} className="text-slate-500" />}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => !isLoading && setIsModalOpen(false)} title={editId ? (requestStatus === 'PENDING' ? "Chỉnh Sửa Đơn Xin Nghỉ" : "Chi Tiết Đơn Xin Nghỉ") : "Tạo Đơn Xin Nghỉ Mới"}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Loại nghỉ phép <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <select disabled={requestStatus !== 'PENDING'} value={type} onChange={e => setType(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: requestStatus === 'PENDING' ? 'var(--bg-primary)' : '#f8fafc', outline: 'none' }}>
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
                                disabled={requestStatus !== 'PENDING'}
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                label="Đến ngày *"
                                type="date"
                                required
                                disabled={requestStatus !== 'PENDING'}
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Lý do nghỉ <span style={{ color: 'var(--danger)' }}>*</span></label>
                        <textarea disabled={requestStatus !== 'PENDING'} required value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: requestStatus === 'PENDING' ? 'var(--bg-primary)' : '#f8fafc', outline: 'none', resize: 'vertical' }} placeholder="Trình bày lý do xin nghỉ chi tiết..."></textarea>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ảnh minh chứng (nếu có)</label>
                        {requestStatus === 'PENDING' && (
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: '0.875rem' }} />
                        )}
                        {imageUrl && (
                            <div className="mt-2 rounded overflow-hidden border border-slate-200" style={{ maxWidth: '200px' }}>
                                <img src={imageUrl} alt="Preview" className="w-full h-auto" />
                            </div>
                        )}
                        {!imageUrl && requestStatus !== 'PENDING' && (
                            <span className="text-sm text-slate-500 italic">Không có ảnh đính kèm.</span>
                        )}
                    </div>

                    <div className="flex gap-2" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            {requestStatus === 'PENDING' ? 'Hủy bỏ' : 'Đóng'}
                        </Button>
                        {requestStatus === 'PENDING' && (
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Đang gửi...' : (editId ? 'Cập Nhật Đơn' : 'Gửi Đơn Xin Nghỉ')}
                            </Button>
                        )}
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!viewImage} onClose={() => setViewImage(null)} title="Ảnh Minh Chứng">
                <div className="flex justify-center p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    {viewImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={viewImage}
                            alt="Minh Chứng y tế / đơn từ"
                            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '4px' }}
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
}
