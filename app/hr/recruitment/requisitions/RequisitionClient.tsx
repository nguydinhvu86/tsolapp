'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useMemo } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { formatMoney } from '@/lib/utils/formatters';
import { 
    Plus, CheckCircle, XCircle, Clock, FileText, Send, Briefcase, 
    Users, CheckCircle2, AlertCircle, Search, Filter, Eye, DollarSign, 
    Building2, Trash2, ShieldCheck, Check, Ban, Lock
} from 'lucide-react';
import { createRequisition, updateRequisitionStatus, deleteRequisition } from './actions';

export default function RequisitionClient({ 
    initialData, 
    users, 
    currentUserId, 
    userRole,
    userPermissions = []
}: {
    initialData: any[];
    users: any[];
    currentUserId: string;
    userRole: string;
    userPermissions?: string[];
}) {
    const [data, setData] = useState(initialData);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewingReq, setViewingReq] = useState<any>(null);
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

    const isAdmin = userRole === 'ADMIN';
    const canManageRecruitment = isAdmin || userPermissions.includes('RECRUITMENT_EDIT') || userPermissions.includes('HR_APPROVE');

    // Fix: SearchableSelect requires { value: string, label: string }
    const userOptions = useMemo(() => {
        return users.map((u: any) => ({
            value: u.id,
            label: `${u.name || u.email}${u.role === 'ADMIN' ? ' ⭐ (Ban Giám Đốc - Admin)' : ` (${u.role})`}`
        }));
    }, [users]);

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
        try {
            const res = await createRequisition(formData);
            if (res.success && res.data) {
                setData([res.data, ...data]);
                setIsAddModalOpen(false);
                setFormData({
                    title: '', department: '', headcount: 1, budget: 0, description: '', requirements: '', approverId: ''
                });
                toast.success("Tạo yêu cầu tuyển dụng thành công! Đã gửi tới người phê duyệt.");
            } else {
                toast.error(res.error || "Có lỗi xảy ra khi tạo yêu cầu tuyển dụng");
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        const actionLabel = status === 'APPROVED' ? 'Phê duyệt' : status === 'REJECTED' ? 'Từ chối' : 'Đóng';
        if (!confirm(`Bạn chắc chắn muốn ${actionLabel} yêu cầu tuyển dụng này?`)) return;
        
        setLoading(true);
        try {
            const res = await updateRequisitionStatus(id, status);
            if (res.success) {
                setData(prev => prev.map((r: any) => r.id === id ? { 
                    ...r, 
                    status,
                    approver: res.data?.approver || r.approver
                } : r));
                if (viewingReq && viewingReq.id === id) {
                    setViewingReq({ ...viewingReq, status, approver: res.data?.approver || viewingReq.approver });
                }
                toast.success(`${actionLabel} yêu cầu tuyển dụng thành công!`);
            } else {
                toast.error(res.error || "Không thể cập nhật trạng thái!");
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi thao tác");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa yêu cầu tuyển dụng này?")) return;
        try {
            const res = await deleteRequisition(id);
            if (res.success) {
                setData(prev => prev.filter((r: any) => r.id !== id));
                if (viewingReq && viewingReq.id === id) setViewingReq(null);
                toast.success("Đã xóa yêu cầu tuyển dụng!");
            } else {
                toast.error(res.error || "Không thể xóa");
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi kết nối");
        }
    };

    const getStatusTheme = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
            case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
            case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
            case 'CLOSED': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
            default: return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'Đã Phê Duyệt';
            case 'REJECTED': return 'Từ Chối';
            case 'PENDING': return 'Chờ Phê Duyệt';
            case 'CLOSED': return 'Đã Đóng';
            default: return status;
        }
    };

    return (
        <div className="space-y-5 w-full max-w-full">
            {/* Standard ERP Header */}
            <PageHeader
                category="TUYỂN DỤNG & ĐỊNH BIÊN"
                categoryColor="emerald"
                title="Quản Lý Yêu Cầu Tuyển Dụng"
                description="Lập phiếu đề xuất nhân sự, theo dõi quy trình xét duyệt và chỉ tiêu định biên phòng ban"
                itemCount={totalCount}
                itemLabel="phiếu"
                actions={
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn btn-primary h-[36px] px-4 text-xs font-bold rounded-xl shadow-xs hover:shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus size={16} />
                        <span>Tạo Yêu Cầu Mới</span>
                    </button>
                }
            />

            {/* Standardized KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div 
                    onClick={() => setStatusFilter('ALL')}
                    className={`bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                        statusFilter === 'ALL'
                            ? 'border-slate-400 ring-2 ring-slate-400/20 shadow-xs'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">Tổng Yêu Cầu</span>
                            <div className="flex items-baseline gap-2 my-1">
                                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tabular-nums">{totalCount}</span>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">phiếu</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Toàn bộ đề xuất</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                            <FileText size={20} className="stroke-[2.2]" />
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => setStatusFilter('PENDING')}
                    className={`bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                        statusFilter === 'PENDING'
                            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/10 shadow-xs'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">Chờ Phê Duyệt</span>
                            <div className="flex items-baseline gap-2 my-1">
                                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 tabular-nums">{pendingCount}</span>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">phiếu</span>
                            </div>
                            <p className="text-xs text-amber-600/90 dark:text-amber-400 font-medium">Đang chờ Ban Giám Đốc</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <Clock size={20} className="stroke-[2.2]" />
                        </div>
                    </div>
                </div>

                <div 
                    onClick={() => setStatusFilter('APPROVED')}
                    className={`bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                        statusFilter === 'APPROVED'
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10 shadow-xs'
                            : 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">Đã Phê Duyệt</span>
                            <div className="flex items-baseline gap-2 my-1">
                                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">{approvedCount}</span>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">phiếu</span>
                            </div>
                            <p className="text-xs text-emerald-600/90 dark:text-emerald-400 font-medium">Sẵn sàng mở đăng tin</p>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <CheckCircle2 size={20} className="stroke-[2.2]" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 block">Chỉ Tiêu Tuyển</span>
                        <div className="flex items-baseline gap-2 my-1">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">{totalHeadcount}</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">nhân sự</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng định biên cần tuyển</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Users size={20} className="stroke-[2.2]" />
                    </div>
                </div>
            </div>

            {/* Table Container - Full Page & Responsive */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 max-w-md">
                        <div className="relative w-full">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Tìm theo mã YC, chức danh, phòng ban..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 h-[36px] text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-800 dark:text-slate-100 shadow-2xs"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            {[
                                { key: 'ALL', label: 'Tất cả' },
                                { key: 'PENDING', label: 'Chờ duyệt' },
                                { key: 'APPROVED', label: 'Đã duyệt' },
                                { key: 'REJECTED', label: 'Từ chối' },
                                { key: 'CLOSED', label: 'Đã đóng' }
                            ].map((st) => (
                                <button
                                    key={st.key}
                                    onClick={() => setStatusFilter(st.key)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        statusFilter === st.key 
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                        <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/70 px-2.5 py-1 rounded-full">
                            {filteredData.length} kết quả
                        </span>
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[960px]">
                        <thead>
                            <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                                <th className="px-4 py-3.5 text-left w-[120px]">Mã YC</th>
                                <th className="px-4 py-3.5 text-left">Vị Trí / Chức Danh</th>
                                <th className="px-4 py-3.5 text-left w-[150px]">Phòng Ban</th>
                                <th className="px-4 py-3.5 text-center w-[90px]">SL Cần</th>
                                <th className="px-4 py-3.5 text-left w-[140px]">Người Đề Xuất</th>
                                <th className="px-4 py-3.5 text-left w-[160px]">Người Duyệt (BGĐ)</th>
                                <th className="px-4 py-3.5 text-center w-[130px]">Trạng Thái</th>
                                <th className="px-4 py-3.5 text-right w-[180px]">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-slate-500 bg-slate-50/30 dark:bg-slate-800/20">
                                        <div className="flex flex-col items-center justify-center">
                                            <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2.5" strokeWidth={1.5} />
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có yêu cầu tuyển dụng nào</h3>
                                            <p className="text-xs text-slate-400 mt-1">Bấm nút "Tạo Yêu Cầu Mới" ở trên để gửi đề xuất nhân sự cho phòng ban.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.map((req: any) => {
                                const canApproveThis = req.status === 'PENDING' && (req.approverId === currentUserId || isAdmin || canManageRecruitment);

                                return (
                                    <tr key={req.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                            {req.code}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div 
                                                onClick={() => setViewingReq(req)} 
                                                className="font-bold text-slate-900 dark:text-slate-100 text-xs hover:text-emerald-600 cursor-pointer transition-colors"
                                            >
                                                {req.title}
                                            </div>
                                            {req.budget ? (
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                                    Ngân sách: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatMoney(req.budget)}</span>
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                                            {req.department || '---'}
                                        </td>
                                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                                            {req.headcount}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                                            {req.requester?.name || req.requester?.email || '---'}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                                            {req.approver ? (
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {req.approver.name || req.approver.email}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">Ban Giám Đốc</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${getStatusTheme(req.status)}`}>
                                                {req.status === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                                                {getStatusLabel(req.status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button 
                                                    onClick={() => setViewingReq(req)} 
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                    title="Xem chi tiết đề xuất"
                                                >
                                                    <Eye size={15} />
                                                </button>

                                                {canApproveThis && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(req.id, 'APPROVED')} 
                                                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 transition-all cursor-pointer flex items-center gap-1 shadow-2xs" 
                                                            title="Ban Giám Đốc Phê Duyệt"
                                                        >
                                                            <CheckCircle size={13} /> Duyệt
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(req.id, 'REJECTED')} 
                                                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 transition-all cursor-pointer flex items-center gap-1 shadow-2xs" 
                                                            title="Từ chối yêu cầu"
                                                        >
                                                            <XCircle size={13} /> Từ chối
                                                        </button>
                                                    </>
                                                )}

                                                {req.status === 'APPROVED' && (isAdmin || canManageRecruitment) && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(req.id, 'CLOSED')} 
                                                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                                                        title="Đóng yêu cầu (Hoàn tất tuyển dụng)"
                                                    >
                                                        <Lock size={12} /> Đóng YC
                                                    </button>
                                                )}

                                                {(isAdmin || req.requesterId === currentUserId) && req.status !== 'APPROVED' && (
                                                    <button 
                                                        onClick={() => handleDelete(req.id)} 
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                        title="Xóa yêu cầu"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Details & Quick Approval Modal for Ban Giám Đốc */}
            {viewingReq && (
                <Modal 
                    isOpen={!!viewingReq} 
                    onClose={() => setViewingReq(null)} 
                    title={`Chi Tiết Yêu Cầu Tuyển Dụng #${viewingReq.code}`}
                    maxWidth="max-w-2xl"
                >
                    <div className="p-5 space-y-4 text-xs">
                        {/* Summary Ribbon */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {viewingReq.title}
                                </h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${getStatusTheme(viewingReq.status)}`}>
                                    {getStatusLabel(viewingReq.status)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                                <div>
                                    <span className="text-[11px] text-slate-400 font-medium block">Phòng ban</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{viewingReq.department || '---'}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] text-slate-400 font-medium block">Chỉ tiêu (Headcount)</span>
                                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{viewingReq.headcount} nhân sự</span>
                                </div>
                                <div>
                                    <span className="text-[11px] text-slate-400 font-medium block">Ngân sách dự kiến</span>
                                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{viewingReq.budget ? formatMoney(viewingReq.budget) : 'Thỏa thuận'}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] text-slate-400 font-medium block">Người đề xuất</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{viewingReq.requester?.name || '---'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Mô tả công việc (JD) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Mô tả công việc (JD)</label>
                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed font-sans min-h-[90px]">
                                {viewingReq.description || 'Không có mô tả chi tiết'}
                            </div>
                        </div>

                        {/* Yêu cầu năng lực */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Yêu cầu năng lực ứng viên</label>
                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed font-sans min-h-[80px]">
                                {viewingReq.requirements || 'Theo tiêu chuẩn tuyển dụng chung của công ty'}
                            </div>
                        </div>

                        {/* Approver info */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
                            <span>Người duyệt đề xuất:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                {viewingReq.approver?.name || viewingReq.approver?.email || 'Ban Giám Đốc'}
                            </span>
                        </div>

                        {/* Modal Action Bar */}
                        <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                            <Button 
                                type="button" 
                                variant="secondary" 
                                onClick={() => setViewingReq(null)}
                                className="h-[36px] px-4 text-xs font-semibold"
                            >
                                Đóng
                            </Button>

                            {viewingReq.status === 'PENDING' && (viewingReq.approverId === currentUserId || isAdmin || canManageRecruitment) && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(viewingReq.id, 'REJECTED')}
                                        disabled={loading}
                                        className="h-[36px] px-4 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                                    >
                                        <Ban size={14} /> Từ Chối Đề Xuất
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(viewingReq.id, 'APPROVED')}
                                        disabled={loading}
                                        className="h-[36px] px-5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                        <Check size={15} className="stroke-[2.5]" /> Ban Giám Đốc Phê Duyệt
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Create Requisition Modal */}
            <Modal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                title="Tạo Yêu Cầu Tuyển Dụng Mới"
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Chức danh cần tuyển <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                required 
                                placeholder="VD: Nhân viên kinh doanh B2B, Kỹ sư hệ thống..."
                                value={formData.title} 
                                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                                className="w-full h-[36px] px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 shadow-2xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Phòng ban yêu cầu
                            </label>
                            <input 
                                placeholder="VD: Khối Kinh Doanh, Phòng Kỹ Thuật..."
                                value={formData.department} 
                                onChange={(e) => setFormData({...formData, department: e.target.value})} 
                                className="w-full h-[36px] px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 shadow-2xs"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Số lượng định biên cần tuyển <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                type="number" 
                                min={1} 
                                required 
                                value={formData.headcount.toString()} 
                                onChange={(e) => setFormData({...formData, headcount: parseInt(e.target.value) || 1})} 
                                className="w-full h-[36px] px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 shadow-2xs font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Ngân sách lương dự kiến (VNĐ)
                            </label>
                            <input 
                                type="number" 
                                placeholder="VD: 15000000"
                                value={formData.budget ? formData.budget.toString() : ''} 
                                onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})} 
                                className="w-full h-[36px] px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 shadow-2xs font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Mô tả công việc (JD) <span className="text-rose-500">*</span>
                        </label>
                        <textarea 
                            required
                            placeholder="Mô tả tóm tắt các trách nhiệm chính của vị trí này..."
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Yêu cầu năng lực ứng viên
                        </label>
                        <textarea 
                            placeholder="Kinh nghiệm, kỹ năng, bằng cấp, thái độ..."
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                            rows={2}
                            value={formData.requirements}
                            onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Người phê duyệt (Ban Giám Đốc / Giám Đốc Khối)
                        </label>
                        <SearchableSelect
                            options={userOptions}
                            value={formData.approverId}
                            onChange={(val: string) => setFormData({...formData, approverId: val})}
                            placeholder="Chọn người duyệt yêu cầu (hoặc để trống để BGĐ duyệt chung)..."
                        />
                    </div>

                    <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => setIsAddModalOpen(false)}
                            className="h-[36px] px-4 text-xs font-semibold"
                        >
                            Hủy Bỏ
                        </Button>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="btn btn-primary h-[36px] px-5 text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <Send size={15} /> 
                            <span>{loading ? 'Đang gửi...' : 'Gửi Yêu Cầu Tuyển Dụng'}</span>
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
