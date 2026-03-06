'use client';

import React, { useState } from 'react';
import { createLeaveRequest } from '@/app/hr/attendance/actions';
import { Plus, Check, X, Clock } from 'lucide-react';
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
        <div>
            <div className="flex justify-end mb-4">
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
                    <Plus className="w-5 h-5" /> Tạo Đơn Mới
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                            <th className="p-4">Loại Đơn</th>
                            <th className="p-4">Từ Ngày</th>
                            <th className="p-4">Đến Ngày</th>
                            <th className="p-4">Lý do</th>
                            <th className="p-4">Trạng Thái</th>
                            <th className="p-4">Ngày Tạo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {requests.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">Chưa có đơn từ nào</td></tr>
                        ) : requests.map(r => (
                            <tr key={r.id} className="hover:bg-slate-50">
                                <td className="p-4 font-medium text-slate-700">
                                    {r.type === 'SICK_LEAVE' ? 'Nghỉ Ốm' : r.type === 'UNPAID_LEAVE' ? 'Nghỉ Không Lương' : 'Nghỉ Phép Năm'}
                                </td>
                                <td className="p-4 text-slate-600">{new Date(r.startDate).toLocaleDateString('vi-VN')}</td>
                                <td className="p-4 text-slate-600">{new Date(r.endDate).toLocaleDateString('vi-VN')}</td>
                                <td className="p-4 text-slate-600 max-w-[200px] truncate" title={r.reason}>{r.reason}</td>
                                <td className="p-4">
                                    {r.status === 'PENDING' && <span className="inline-flex px-2 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full items-center gap-1"><Clock className="w-3 h-3" /> ĐANG CHỜ</span>}
                                    {r.status === 'APPROVED' && <span className="inline-flex px-2 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full items-center gap-1"><Check className="w-3 h-3" /> ĐÃ DUYỆT</span>}
                                    {r.status === 'REJECTED' && <span className="inline-flex px-2 py-1 bg-red-100 text-red-700 font-bold text-xs rounded-full items-center gap-1"><X className="w-3 h-3" /> TỪ CHỐI</span>}
                                </td>
                                <td className="p-4 text-slate-500 text-sm">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => !isLoading && setIsModalOpen(false)} title="Tạo Đơn Xin Nghỉ" maxWidth="500px">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Loại nghỉ phép</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="ANNUAL_LEAVE">Nghỉ Phép Năm</option>
                            <option value="SICK_LEAVE">Nghỉ Ốm Đau</option>
                            <option value="UNPAID_LEAVE">Nghỉ Không Lương</option>
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Từ ngày</label>
                            <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Đến ngày</label>
                            <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Lý do nghỉ</label>
                        <textarea required value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Trình bày lý do xin nghỉ..."></textarea>
                    </div>
                    <div className="flex gap-3 justify-end mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Hủy</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-70">
                            {isLoading ? 'Đang gửi...' : 'Gửi Đơn'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
