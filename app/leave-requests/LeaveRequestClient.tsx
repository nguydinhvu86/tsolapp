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
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                        Đơn Từ & Nghỉ Phép
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Tạo và theo dõi tiến trình phê duyệt các đơn xin nghỉ phép, nghỉ ốm và giải trình ({requests.length} đơn)
                    </p>
                </div>
                <Button 
                    onClick={openNewModal} 
                    className="px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-200 transition-all"
                >
                    <Plus size={15} /> Tạo Đơn Mới
                </Button>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Lịch Sử Đơn Từ</h2>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                        {requests.length} đơn
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Loại Đơn</th>
                                <th className="px-4 py-3 text-left">Từ Ngày</th>
                                <th className="px-4 py-3 text-left">Đến Ngày</th>
                                <th className="px-4 py-3 text-left">Lý do</th>
                                <th className="px-4 py-3 text-center w-[130px]">Minh Chứng</th>
                                <th className="px-4 py-3 text-left w-[200px]">Trạng Thái & Người Duyệt</th>
                                <th className="px-4 py-3 text-left w-[120px]">Ngày Tạo</th>
                                <th className="px-4 py-3 text-right w-[80px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-xs font-medium text-slate-400">
                                        Chưa có đơn từ nào được tạo.
                                    </td>
                                </tr>
                            ) : requests.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-slate-900">
                                        {r.type === 'SICK_LEAVE' ? 'Nghỉ Ốm Đau' : r.type === 'UNPAID_LEAVE' ? 'Nghỉ Không Lương' : 'Nghỉ Phép Năm'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 font-medium">{new Date(r.startDate).toLocaleDateString('vi-VN')}</td>
                                    <td className="px-4 py-3 text-slate-700 font-medium">{new Date(r.endDate).toLocaleDateString('vi-VN')}</td>
                                    <td className="px-4 py-3 max-w-[280px]">
                                        <div className="truncate font-normal text-slate-600" title={r.reason}>{r.reason}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {r.imageUrl ? (
                                            <button 
                                                type="button" 
                                                onClick={() => setViewImage(r.imageUrl)} 
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-1 rounded-lg border-none cursor-pointer transition-colors"
                                            >
                                                <FileImage size={13} /> Xem Ảnh
                                            </button>
                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            {r.status === 'PENDING' && <span className="w-fit px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Đang Chờ</span>}
                                            {r.status === 'APPROVED' && <span className="w-fit px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã Duyệt</span>}
                                            {r.status === 'REJECTED' && <span className="w-fit px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Từ Chối</span>}

                                            {r.approver && r.status !== 'PENDING' && (
                                                <div className="text-[11px] text-slate-500 mt-0.5 flex flex-col">
                                                    <span>Duyệt bởi: <strong className="text-slate-700">{r.approver.name}</strong></span>
                                                    <span className="text-[10px] text-slate-400">{new Date(r.updatedAt).toLocaleString('vi-VN')}</span>
                                                </div>
                                            )}
                                            {r.status === 'REJECTED' && r.approverNote && (
                                                <div className="text-[10px] text-rose-600 mt-1 italic border-l-2 border-rose-300 pl-1.5">
                                                    Lý do: {r.approverNote}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => openEditModal(r)} 
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" 
                                            title={r.status === 'PENDING' ? "Chỉnh sửa" : "Xem chi tiết"}
                                        >
                                            {r.status === 'PENDING' ? <Edit size={16} /> : <Eye size={16} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
