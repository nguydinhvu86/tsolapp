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
        <Card>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="flex items-center gap-3">
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Quản Lý Đơn Nghỉ Phép</h2>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '0.125rem 0.5rem', borderRadius: '1rem' }}>
                        {filteredRequests.length} đơn
                    </span>
                </div>
                <div className="flex gap-2">
                    <Button onClick={exportExcel} variant="secondary" className="gap-2">
                        <FileDown size={16} /> Xuất Excel
                    </Button>
                    <Button onClick={exportPDF} variant="secondary" className="gap-2">
                        <FileText size={16} /> Xuất PDF
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 mb-4 flex-wrap items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex-1 min-w-[150px]">
                    <Input label="Ngày tạo (Từ)" type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                </div>
                <div className="flex-1 min-w-[150px]">
                    <Input label="Ngày tạo (Đến)" type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                </div>
                <div className="flex-1 min-w-[150px] flex flex-col gap-1.5">
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Trạng Thái</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', outline: 'none' }}>
                        <option value="ALL">Tất cả</option>
                        <option value="PENDING">Đang chờ duyệt</option>
                        <option value="APPROVED">Đã duyệt</option>
                        <option value="REJECTED">Bị từ chối</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[150px] flex flex-col gap-1.5">
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Loại Đơn</label>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', outline: 'none' }}>
                        <option value="ALL">Tất cả</option>
                        <option value="ANNUAL_LEAVE">Nghỉ Phép Năm</option>
                        <option value="SICK_LEAVE">Nghỉ Ốm</option>
                        <option value="UNPAID_LEAVE">Nghỉ Không Lương</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                    <Input label="Tìm Nhân Viên" placeholder="Tên hoặc email..." value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)} />
                </div>
                <div className="flex-1 min-w-[160px]">
                    <Input label="Tìm Người Duyệt" placeholder="Tên người duyệt..." value={filterApprover} onChange={(e) => setFilterApprover(e.target.value)} />
                </div>
                <div>
                    <Button variant="secondary" onClick={() => { setFilterEmp(''); setFilterApprover(''); setFilterType('ALL'); setFilterStatus('ALL'); setFilterDateFrom(''); setFilterDateTo(''); }}>
                        Xóa Lọc
                    </Button>
                </div>
            </div>

            <Table>
                <thead>
                    <tr>
                        <th style={{ width: '100px' }}>Ngày Tạo</th>
                        <th style={{ minWidth: '150px' }}>Nhân viên</th>
                        <th style={{ width: '130px' }}>Loại Đơn</th>
                        <th style={{ minWidth: '130px' }}>Thời gian</th>
                        <th style={{ minWidth: '150px' }}>Lý do</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Minh Chứng</th>
                        <th style={{ width: '150px' }}>Trạng Thái</th>
                        <th style={{ width: '170px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredRequests.length === 0 ? (
                        <tr>
                            <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                <div className="flex flex-col items-center gap-2">
                                    <Check size={32} style={{ color: 'var(--success)' }} />
                                    <span>Không tìm thấy đơn nào.</span>
                                </div>
                            </td>
                        </tr>
                    ) : filteredRequests.map((r: any) => (
                        <tr key={r.id}>
                            <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td>
                                <div className="flex items-center gap-2">
                                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--text-muted)', flexShrink: 0 }}>
                                        {r.user?.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="min-w-0">
                                        <div style={{ fontWeight: 500 }} className="truncate" title={r.user?.name}>{r.user?.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="truncate" title={r.user?.email}>{r.user?.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td style={{ fontWeight: 500 }}>
                                {typeLabels[r.type] || r.type}
                            </td>
                            <td>
                                <div style={{ fontSize: '0.875rem' }}>
                                    Từ: {new Date(r.startDate).toLocaleDateString('vi-VN')} <br />
                                    Đến: {new Date(r.endDate).toLocaleDateString('vi-VN')}
                                </div>
                            </td>
                            <td style={{ maxWidth: '200px' }}>
                                <div className="line-clamp-2" style={{ fontSize: '0.875rem' }} title={r.reason}>{r.reason}</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {r.imageUrl ? (
                                    <button
                                        type="button"
                                        onClick={() => setViewImage(r.imageUrl)}
                                        style={{ display: 'inline-flex', padding: '0.25rem 0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 500, border: 'none', cursor: 'pointer' }}
                                    >
                                        Xem Ảnh
                                    </button>
                                ) : <span className="text-slate-400 text-xs">-</span>}
                            </td>
                            <td>
                                <div className="flex flex-col gap-1">
                                    {r.status === 'PENDING' && <span className="w-fit p-1 px-2 rounded-full text-xs font-medium bg-amber-100 text-amber-800">ĐANG CHỜ</span>}
                                    {r.status === 'APPROVED' && <span className="w-fit p-1 px-2 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">ĐÃ DUYỆT</span>}
                                    {r.status === 'REJECTED' && <span className="w-fit p-1 px-2 rounded-full text-xs font-medium bg-rose-100 text-rose-800">TỪ CHỐI</span>}

                                    {r.approver && r.status !== 'PENDING' && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Bởi: <strong title={r.approver.name} className="truncate max-w-[120px] inline-block align-bottom">{r.approver.name}</strong>
                                        </div>
                                    )}
                                    {r.status === 'REJECTED' && r.approverNote && (
                                        <div className="text-[11px] text-rose-600 mt-1 italic border-l-2 border-rose-300 pl-1">
                                            Lý do: {r.approverNote}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td>
                                {r.status === 'PENDING' ? (
                                    <div className="flex justify-center gap-2">
                                        <Button
                                            onClick={() => handleResolve(r.id, 'APPROVE')}
                                            disabled={loadingId === r.id}
                                            style={{ background: 'var(--success)', color: '#fff', borderColor: 'var(--success)' }}
                                            className="gap-1 px-2 py-1"
                                        >
                                            <Check size={16} /> Duyệt
                                        </Button>
                                        <Button
                                            onClick={() => { setRejectingId(r.id); setRejectNote(''); }}
                                            disabled={loadingId === r.id}
                                            variant="danger"
                                            className="gap-1 px-2 py-1"
                                        >
                                            <X size={16} /> Từ chối
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-sm italic">Đã xử lý</div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal isOpen={!!rejectingId} onClose={() => setRejectingId(null)} title="Lý do Từ Chối">
                <form onSubmit={confirmReject} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            Vui lòng cho biết lý do từ chối đơn này <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <textarea
                            autoFocus
                            required
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            rows={3}
                            disabled={loadingId === rejectingId}
                            style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', outline: 'none', resize: 'vertical' }}
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
        </Card>
    );
}
