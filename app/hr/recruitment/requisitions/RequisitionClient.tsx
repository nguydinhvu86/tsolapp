'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { Plus, CheckCircle, XCircle, Clock, FileText, Send, Briefcase, Users, CheckCircle2, AlertCircle, Search, Filter } from 'lucide-react';
import { createRequisition, updateRequisitionStatus } from './actions';

export default function RequisitionClient({ initialData, users, currentUserId, userRole }: any) {
    const [data, setData] = useState(initialData);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const [formData, setFormData] = useState({
        title: '',
        department: '',
        headcount: 1,
        budget: 0,
        description: '',
        requirements: '',
        approverId: ''
    });

    const userOptions = users.map((u: any) => ({
        id: u.id,
        label: `${u.name || u.email} (${u.role})`
    }));

    // KPI Metrics
    const totalCount = data.length;
    const pendingCount = data.filter((r: any) => r.status === 'PENDING').length;
    const approvedCount = data.filter((r: any) => r.status === 'APPROVED').length;
    const totalHeadcount = data.reduce((sum: number, r: any) => sum + (r.headcount || 0), 0);

    // Filtered data
    const filteredData = useMemo(() => {
        return data.filter((r: any) => {
            const matchesSearch = 
                (r.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.department || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [data, searchTerm, statusFilter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createRequisition(formData);
        if (res.success && res.data) {
            setData([res.data, ...data]);
            setIsAddModalOpen(false);
            setFormData({
                title: '', department: '', headcount: 1, budget: 0, description: '', requirements: '', approverId: ''
            });
        } else {
            alert(res.error || "Có lỗi xảy ra");
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        if (!confirm(`Bạn chắc chắn muốn đổi trạng thái thành ${status}?`)) return;
        const res = await updateRequisitionStatus(id, status);
        if (res.success) {
            setData(data.map((r: any) => r.id === id ? { ...r, status } : r));
        } else {
            alert(res.error || "Không thể cập nhật!");
        }
    };

    const getStatusTheme = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'CLOSED': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'Đã Duyệt';
            case 'REJECTED': return 'Từ Chối';
            case 'PENDING': return 'Chờ Duyệt';
            case 'CLOSED': return 'Đã Đóng';
            default: return status;
        }
    };

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                        Quản Lý Yêu Cầu Tuyển Dụng
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Lập phiếu đề xuất nhân sự, theo dõi quy trình xét duyệt và chỉ tiêu định biên phòng ban
                    </p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-200 transition-all cursor-pointer"
                >
                    <Plus size={15} /> Tạo Yêu Cầu Mới
                </button>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tổng Yêu Cầu</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-slate-900">{totalCount}</span>
                            <span className="text-xs text-slate-400 font-medium">phiếu</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Toàn bộ đề xuất</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                        <FileText size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-amber-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Chờ Phê Duyệt</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-amber-600">{pendingCount}</span>
                            <span className="text-xs text-slate-400 font-medium">phiếu</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Đang chờ quản lý duyệt</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                        <Clock size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-emerald-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Đã Phê Duyệt</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-emerald-600">{approvedCount}</span>
                            <span className="text-xs text-slate-400 font-medium">phiếu</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Sẵn sàng mở đăng tin</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-indigo-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Chỉ Tiêu Tuyển</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-indigo-600">{totalHeadcount}</span>
                            <span className="text-xs text-slate-400 font-medium">nhân sự</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Tổng định biên cần tuyển</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <Users size={22} />
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 max-w-md">
                        <div className="relative w-full">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Tìm theo mã YC, chức danh, phòng ban..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            {['ALL', 'PENDING', 'APPROVED', 'CLOSED'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                        statusFilter === st 
                                            ? 'bg-white text-slate-900 shadow-xs' 
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    {st === 'ALL' ? 'Tất cả' : st === 'PENDING' ? 'Chờ duyệt' : st === 'APPROVED' ? 'Đã duyệt' : 'Đã đóng'}
                                </button>
                            ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-1 rounded-full">
                            {filteredData.length} kết quả
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Mã YC</th>
                                <th className="px-4 py-3 text-left">Vị Trí / Chức Danh</th>
                                <th className="px-4 py-3 text-left">Phòng Ban</th>
                                <th className="px-4 py-3 text-center">SL Cần</th>
                                <th className="px-4 py-3 text-left">Người Duyệt</th>
                                <th className="px-4 py-3 text-center">Trạng Thái</th>
                                <th className="px-4 py-3 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-slate-500 bg-slate-50/30">
                                        <div className="flex flex-col items-center justify-center">
                                            <Briefcase className="w-10 h-10 text-slate-300 mb-2.5" strokeWidth={1.5} />
                                            <h3 className="text-sm font-bold text-slate-700">Chưa có yêu cầu tuyển dụng nào</h3>
                                            <p className="text-xs text-slate-400 mt-1">Bấm nút "Tạo Yêu Cầu Mới" ở trên để gửi đề xuất nhân sự cho phòng ban.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.map((req: any) => (
                                <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">{req.code}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-900">{req.title}</div>
                                        {req.description && (
                                            <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{req.description}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-700">{req.department || '---'}</td>
                                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">{req.headcount}</td>
                                    <td className="px-4 py-3 text-slate-600">
                                        {req.approver?.name || req.approver?.email || <span className="text-slate-400 italic">Chưa gán</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusTheme(req.status)}`}>
                                            {getStatusLabel(req.status)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {req.status === 'PENDING' && (req.approverId === currentUserId || userRole === 'ADMIN') && (
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button 
                                                    onClick={() => handleUpdateStatus(req.id, 'APPROVED')} 
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer flex items-center gap-1" 
                                                    title="Duyệt yêu cầu"
                                                >
                                                    <CheckCircle size={13} /> Duyệt
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateStatus(req.id, 'REJECTED')} 
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer flex items-center gap-1" 
                                                    title="Từ chối"
                                                >
                                                    <XCircle size={13} /> Từ chối
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                title="Tạo Yêu cầu Tuyển dụng"
                maxWidth="max-w-3xl"
            >
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Chức danh cần tuyển *" 
                            required 
                            value={formData.title} 
                            onChange={(e) => setFormData({...formData, title: e.target.value})} 
                        />
                        <Input 
                            label="Phòng ban" 
                            value={formData.department} 
                            onChange={(e) => setFormData({...formData, department: e.target.value})} 
                        />
                        <Input 
                            label="Số lượng (Headcount) *" 
                            type="number" 
                            min={1} 
                            required 
                            value={formData.headcount.toString()} 
                            onChange={(e) => setFormData({...formData, headcount: parseInt(e.target.value) || 1})} 
                        />
                        <Input 
                            label="Ngân sách lương (Dự kiến)" 
                            type="number" 
                            value={formData.budget?.toString() || ''} 
                            onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})} 
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Mô tả công việc (JD)</label>
                        <textarea 
                            required
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Yêu cầu năng lực (Requirements)</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
                            rows={3}
                            value={formData.requirements}
                            onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Người phê duyệt (Director/Manager)</label>
                        <SearchableSelect
                            options={userOptions}
                            value={formData.approverId}
                            onChange={(val: any) => setFormData({...formData, approverId: val})}
                            placeholder="Chọn người duyệt yêu cầu..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <Button type="button" className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
                        <Button type="submit" disabled={loading} className="flex items-center gap-2">
                            <Send size={16} /> Gửi yêu cầu
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
