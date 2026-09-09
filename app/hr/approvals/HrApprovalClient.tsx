'use client';

import React, { useState } from 'react';
import { resolveLeaveRequest } from '@/app/hr/attendance/actions';
import { Check, X, FileDown, FileText } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function HrApprovalClient({ initialData }: { initialData: any[] }) {
    const [requests, setRequests] = useState(initialData);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // Filters
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('PENDING'); // Default to pending
    const [filterEmp, setFilterEmp] = useState('');
    const [filterApprover, setFilterApprover] = useState('');

    // Reject Modal
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState('');

    // Image Modal
    const [viewImage, setViewImage] = useState<string | null>(null);

    const handleResolve = async (id: string, action: 'APPROVE' | 'REJECT', note?: string) => {
        if (action === 'APPROVE') {
            if (!confirm(`Xác nhận Duyệt đơn này?`)) return;
        }

        setLoadingId(id);
        const res = await resolveLeaveRequest(id, action, note);
        if (res.success) {
            setRequests(requests.filter((r: any) => r.id !== id));
            if (action === 'REJECT') setRejectingId(null);
        } else {
            alert(res.error);
        }
        setLoadingId(null);
    };

    const confirmReject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingId) return;
        if (!rejectNote.trim()) {
            alert("Vui lòng nhập lý do từ chối");
            return;
        }
        handleResolve(rejectingId, 'REJECT', rejectNote);
    };

    const filteredRequests = requests.filter((r: any) => {
        if (filterType !== 'ALL' && r.type !== filterType) return false;
        if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;

        if (filterEmp) {
            const searchLower = filterEmp.toLowerCase();
            const nameMatch = r.user?.name?.toLowerCase().includes(searchLower);
            const emailMatch = r.user?.email?.toLowerCase().includes(searchLower);
            if (!nameMatch && !emailMatch) return false;
        }

        if (filterApprover) {
            const searchLower = filterApprover.toLowerCase();
            const approverMatch = r.approver?.name?.toLowerCase().includes(searchLower);
            if (!approverMatch) return false;
        }

        if (filterDateFrom) {
            if (new Date(r.createdAt) < new Date(filterDateFrom)) return false;
        }

        if (filterDateTo) {
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59, 999);
            if (new Date(r.createdAt) > toDate) return false;
        }

        return true;
    });

    const typeLabels: Record<string, string> = { SICK_LEAVE: 'Nghỉ Ốm', ANNUAL_LEAVE: 'Phép Năm', UNPAID_LEAVE: 'Nghỉ Không Lương' };
    const statusLabels: Record<string, string> = { PENDING: 'Đang chờ', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };

    const exportExcel = () => {
        const data = filteredRequests.map((r: any) => ({
            'Ngày Tạo Đơn': new Date(r.createdAt).toLocaleDateString('vi-VN'),
            'Tên Nhân Viên': r.user?.name || '',
            'Email': r.user?.email || '',
            'Loại Đơn': typeLabels[r.type] || r.type,
            'Từ Ngày': new Date(r.startDate).toLocaleDateString('vi-VN'),
            'Đến Ngày': new Date(r.endDate).toLocaleDateString('vi-VN'),
            'Lý Do Xin Nghỉ': r.reason,
            'Trạng Thái': statusLabels[r.status] || r.status,
            'Người Duyệt': r.approver?.name || '',
            'Ghi Chú HR': r.approverNote || ''
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Don_Nghi_Phep");
        XLSX.writeFile(wb, "Danh_Sach_Don_Nghi_Phep.xlsx");
    };

    const exportPDF = () => {
        try {
            const doc = new jsPDF('landscape');
            doc.text("Danh Sach Don Nghi Phep", 14, 15);

            const tableColumn = ["Ngay Tao", "Nhan Vien", "Loai Don", "Thoi Gian", "Ly Do", "Trang Thai", "Nguoi Duyet"];
            const tableRows: any[] = [];

            filteredRequests.forEach((r: any) => {
                const requestData = [
                    new Date(r.createdAt).toLocaleDateString('vi-VN'),
                    r.user?.name || '',
                    typeLabels[r.type] || r.type,
                    `Tu ${new Date(r.startDate).toLocaleDateString('vi-VN')} den ${new Date(r.endDate).toLocaleDateString('vi-VN')}`,
                    r.reason.substring(0, 30) + (r.reason.length > 30 ? '...' : ''),
                    statusLabels[r.status] || r.status,
                    r.approver?.name || ''
                ];
                tableRows.push(requestData);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 20,
                styles: { fontSize: 8, overflow: 'linebreak' },
                columnStyles: { 4: { cellWidth: 50 }, 3: { cellWidth: 40 } }
            });

            doc.save("Danh_Sach_Don_Nghi_Phep.pdf");
        } catch (error) {
            console.error("Lỗi xuất PDF:", error);
            alert("Có lỗi xảy ra khi xuất PDF. Vui lòng kiểm tra console.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></span>
                        Duyệt Đơn Nghỉ Phép
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Phê duyệt và quản lý các yêu cầu nghỉ phép, nghỉ ốm của toàn bộ nhân sự ({filteredRequests.length} đơn)
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button onClick={exportExcel} variant="secondary" className="px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none transition-all">
                        <FileDown size={15} className="text-emerald-600" /> Xuất Excel
                    </Button>
                    <Button onClick={exportPDF} variant="secondary" className="px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none transition-all">
                        <FileText size={15} className="text-rose-600" /> Xuất PDF
                    </Button>
                </div>
            </div>

            {/* Table & Filters Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex flex-wrap gap-2.5 items-center flex-1">
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                            <span className="text-[11px] font-bold text-slate-500">Từ:</span>
                            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="bg-transparent text-xs text-slate-800 font-medium outline-none cursor-pointer" />
                            <span className="text-[11px] font-bold text-slate-500 ml-1">Đến:</span>
                            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="bg-transparent text-xs text-slate-800 font-medium outline-none cursor-pointer" />
                        </div>

                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium">
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="PENDING">Đang chờ duyệt</option>
                            <option value="APPROVED">Đã duyệt</option>
                            <option value="REJECTED">Bị từ chối</option>
                        </select>

                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium">
                            <option value="ALL">Tất cả loại đơn</option>
                            <option value="ANNUAL_LEAVE">Nghỉ Phép Năm</option>
                            <option value="SICK_LEAVE">Nghỉ Ốm</option>
                            <option value="UNPAID_LEAVE">Nghỉ Không Lương</option>
                        </select>

                        <input 
                            placeholder="Tìm nhân viên..." 
                            value={filterEmp} 
                            onChange={(e) => setFilterEmp(e.target.value)} 
                            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400 font-medium w-40"
                        />

                        <input 
                            placeholder="Tìm người duyệt..." 
                            value={filterApprover} 
                            onChange={(e) => setFilterApprover(e.target.value)} 
                            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400 font-medium w-40"
                        />

                        <button 
                            onClick={() => { setFilterEmp(''); setFilterApprover(''); setFilterType('ALL'); setFilterStatus('ALL'); setFilterDateFrom(''); setFilterDateTo(''); }}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium underline px-2 py-1 cursor-pointer"
                        >
                            Xóa lọc
                        </button>
                    </div>

                    <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                        {filteredRequests.length} đơn
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left w-[110px]">Ngày Tạo</th>
                                <th className="px-4 py-3 text-left min-w-[160px]">Nhân viên</th>
                                <th className="px-4 py-3 text-left w-[130px]">Loại Đơn</th>
                                <th className="px-4 py-3 text-left min-w-[140px]">Thời gian</th>
                                <th className="px-4 py-3 text-left min-w-[160px]">Lý do</th>
                                <th className="px-4 py-3 text-center w-[110px]">Minh Chứng</th>
                                <th className="px-4 py-3 text-left w-[160px]">Trạng Thái</th>
                                <th className="px-4 py-3 text-center w-[180px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-slate-500 bg-slate-50/30">
                                        <div className="flex flex-col items-center justify-center">
                                            <Check size={32} className="text-emerald-500 mb-2" />
                                            <span className="text-xs font-semibold text-slate-600">Không tìm thấy đơn nào cần xử lý.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRequests.map((r: any) => (
                                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                                                {r.user?.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-900 truncate" title={r.user?.name}>{r.user?.name}</div>
                                                <div className="text-[10px] text-slate-400 truncate" title={r.user?.email}>{r.user?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-800">
                                        {typeLabels[r.type] || r.type}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        <div className="font-medium text-slate-800">{new Date(r.startDate).toLocaleDateString('vi-VN')}</div>
                                        <div className="text-[10px] text-slate-400 font-medium">đến {new Date(r.endDate).toLocaleDateString('vi-VN')}</div>
                                    </td>
                                    <td className="px-4 py-3 max-w-[220px]">
                                        <div className="line-clamp-2 text-slate-600 text-[11px]" title={r.reason}>{r.reason}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {r.imageUrl ? (
                                            <button
                                                type="button"
                                                onClick={() => setViewImage(r.imageUrl)}
                                                className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-600 hover:text-indigo-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                            >
                                                Xem Ảnh
                                            </button>
                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            {r.status === 'PENDING' && <span className="w-fit px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Đang Chờ</span>}
                                            {r.status === 'APPROVED' && <span className="w-fit px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã Duyệt</span>}
                                            {r.status === 'REJECTED' && <span className="w-fit px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Từ Chối</span>}

                                            {r.approver && r.status !== 'PENDING' && (
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    Bởi: <strong title={r.approver.name} className="text-slate-700 truncate max-w-[120px] inline-block align-bottom">{r.approver.name}</strong>
                                                </div>
                                            )}
                                            {r.status === 'REJECTED' && r.approverNote && (
                                                <div className="text-[10px] text-rose-600 mt-1 italic border-l-2 border-rose-300 pl-1">
                                                    Lý do: {r.approverNote}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {r.status === 'PENDING' ? (
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleResolve(r.id, 'APPROVE')}
                                                    disabled={loadingId === r.id}
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-all cursor-pointer"
                                                >
                                                    <Check size={13} /> Duyệt
                                                </button>
                                                <button
                                                    onClick={() => { setRejectingId(r.id); setRejectNote(''); }}
                                                    disabled={loadingId === r.id}
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1 transition-all cursor-pointer"
                                                >
                                                    <X size={13} /> Từ chối
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-xs font-medium">Đã xử lý</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={!!rejectingId} onClose={() => setRejectingId(null)} title="Lý do Từ Chối">
                <form onSubmit={confirmReject} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                            Vui lòng cho biết lý do từ chối đơn này <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            autoFocus
                            required
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            rows={3}
                            disabled={loadingId === rejectingId}
                            className="p-3 text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 resize-y"
                            placeholder="Nhập lý do chi tiết để nhân viên biết..."
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                        <Button type="button" variant="secondary" onClick={() => setRejectingId(null)}>Hủy</Button>
                        <Button type="submit" variant="danger" disabled={loadingId === rejectingId}>
                            {loadingId === rejectingId ? 'Đang xử lý...' : 'Xác nhận Từ Chối'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={!!viewImage} onClose={() => setViewImage(null)} title="Ảnh Minh Chứng">
                <div className="flex justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    {viewImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={viewImage}
                            alt="Minh Chứng y tế / đơn từ"
                            className="max-w-full max-h-[70vh] object-contain rounded-lg"
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
}
