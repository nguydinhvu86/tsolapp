'use client';

import React, { useState } from 'react';
import { resolveLeaveRequest } from '@/app/hr/attendance/actions';
import { Check, X } from 'lucide-react';

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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
                        <th className="p-4">Nhân viên</th>
                        <th className="p-4">Loại Đơn</th>
                        <th className="p-4">Thời gian</th>
                        <th className="p-4">Lý do</th>
                        <th className="p-4 text-center">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {requests.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">Tuyệt vời! Không có đơn nào đang chờ duyệt.</td></tr>
                    ) : requests.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                            <td className="p-4">
                                <p className="font-bold text-slate-700">{r.user?.name}</p>
                                <p className="text-xs text-slate-500">{r.user?.email}</p>
                            </td>
                            <td className="p-4 font-medium text-slate-700">
                                {r.type === 'SICK_LEAVE' ? 'Nghỉ Ốm' : r.type === 'UNPAID_LEAVE' ? 'Nghỉ Không Lương' : 'Nghỉ Phép Năm'}
                            </td>
                            <td className="p-4 text-slate-600 text-sm">
                                {new Date(r.startDate).toLocaleDateString('vi-VN')} <br />
                                <span className="text-slate-400">đến</span> {new Date(r.endDate).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="p-4 text-slate-600 max-w-[200px] text-sm">{r.reason}</td>
                            <td className="p-4">
                                <div className="flex justify-center gap-2">
                                    <button
                                        onClick={() => handleResolve(r.id, 'APPROVE')}
                                        disabled={loadingId === r.id}
                                        className="flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                                    >
                                        <Check className="w-4 h-4" /> Duyệt
                                    </button>
                                    <button
                                        onClick={() => handleResolve(r.id, 'REJECT')}
                                        disabled={loadingId === r.id}
                                        className="flex items-center gap-1 bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                                    >
                                        <X className="w-4 h-4" /> Từ chối
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
