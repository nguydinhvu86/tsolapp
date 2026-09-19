'use client'

import React, { useState, useEffect } from 'react';
import { 
    CheckSquare, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    Layers, 
    User, 
    DollarSign, 
    RefreshCw,
    Plus,
    X,
    Shield
} from 'lucide-react';
import { fetchApprovalCenterData, handleApproveReject, submitNewApprovalRequest } from './actions';

export default function ApprovalCenterClient() {
    const [requests, setRequests] = useState<any[]>([]);
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Create Request Modal
    const [showModal, setShowModal] = useState(false);
    const [entityType, setEntityType] = useState<'EXPENSE' | 'PURCHASE_BILL' | 'PURCHASE_PAYMENT' | 'CASH_TRANSACTION'>('EXPENSE');
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState<number>(0);
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const res = await fetchApprovalCenterData();
        if (res.success) {
            setRequests(res.requests || []);
            setRules(res.rules || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    const handleAction = async (requestId: string, decision: 'APPROVED' | 'REJECTED') => {
        const confirmMsg = decision === 'APPROVED' ? 'Xác nhận DUYỆT yêu cầu này?' : 'Xác nhận TỪ CHỐI yêu cầu này?';
        if (!confirm(confirmMsg)) return;

        setActionLoadingId(requestId);
        const res = await handleApproveReject({ requestId, decision });
        setActionLoadingId(null);

        if (res.success) {
            loadData();
        } else {
            alert(res.error || 'Lỗi xử lý phê duyệt');
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || amount <= 0) {
            alert('Vui lòng nhập đầy đủ tiêu đề và số tiền hợp lệ');
            return;
        }

        setSaving(true);
        const res = await submitNewApprovalRequest({
            entityType,
            entityId: `REQ-${Date.now()}`,
            title,
            amount: Number(amount)
        });
        setSaving(false);

        if (res.success) {
            setShowModal(false);
            setTitle('');
            setAmount(0);
            loadData();
        } else {
            alert(res.error || 'Lỗi khi gửi yêu cầu');
        }
    };

    const filteredRequests = requests.filter(r => statusFilter === 'ALL' || r.status === statusFilter);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Chờ phê duyệt</span>;
            case 'APPROVED':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt hoàn tất</span>;
            case 'REJECTED':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Bị từ chối</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                        <Shield className="w-5 h-5" /> Kiểm Soát Tài Chính & Quản Trị Doanh Nghiệp
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Trung Tâm Phê Duyệt Chi Tiêu Đa Cấp</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Quy trình phê duyệt chi tiêu tự động theo hạn mức (&lt;10tr Quản lý, 10-50tr Giám đốc Tài chính CFO, &gt;50tr Tổng Giám đốc CEO)
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" /> Tạo Yêu Cầu Duyệt Chi
                    </button>
                </div>
            </div>

            {/* Approval Rules Overview Banner */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" /> Ma Trận Hạn Mức Phê Duyệt Hiện Hành (Approval Matrix)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">Cấp 1: Trưởng Bộ Phận / Manager</span>
                        <p className="text-slate-500 mt-0.5">Hạn mức duyệt: <strong>Dưới 10.000.000 VNĐ</strong></p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">Cấp 2: Giám Đốc Tài Chính / CFO</span>
                        <p className="text-slate-500 mt-0.5">Hạn mức duyệt: <strong>10.000.000 - 50.000.000 VNĐ</strong></p>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">Cấp 3: Tổng Giám Đốc / CEO</span>
                        <p className="text-slate-500 mt-0.5">Hạn mức duyệt: <strong>Trên 50.000.000 VNĐ</strong></p>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex gap-2">
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                statusFilter === st
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                        >
                            {st === 'ALL' ? 'Tất cả' : st === 'PENDING' ? 'Chờ duyệt' : st === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                        </button>
                    ))}
                </div>
                <button onClick={loadData} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Request List */}
            <div className="space-y-4">
                {filteredRequests.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
                        <CheckSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="font-semibold text-base">Chưa có yêu cầu phê duyệt nào</p>
                    </div>
                ) : (
                    filteredRequests.map((req) => (
                        <div key={req.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded">
                                            {req.entityType}
                                        </span>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{req.title}</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Người tạo: <strong>{req.requestedBy?.name || 'Hệ thống'}</strong> • Tạo lúc: {new Date(req.createdAt).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
                                        {formatCurrency(req.requestedAmount)}
                                    </span>
                                    {getStatusBadge(req.status)}
                                </div>
                            </div>

                            {/* Approval Steps Progression */}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="font-semibold">Tiến trình phê duyệt:</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-bold text-slate-700 dark:text-slate-300">
                                    Bước {req.currentStep} / {req.totalSteps}
                                </span>
                            </div>

                            {/* Actions if PENDING */}
                            {req.status === 'PENDING' && (
                                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={() => handleAction(req.id, 'REJECTED')}
                                        disabled={actionLoadingId === req.id}
                                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all"
                                    >
                                        <XCircle className="w-4 h-4" /> Từ Chối
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, 'APPROVED')}
                                        disabled={actionLoadingId === req.id}
                                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Duyệt Bước Này
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Tạo Yêu Cầu Duyệt Chi</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Loại chứng từ</label>
                                <select
                                    value={entityType}
                                    onChange={(e) => setEntityType(e.target.value as any)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                                >
                                    <option value="EXPENSE">Phiếu Chi Phí (Expense)</option>
                                    <option value="PURCHASE_BILL">Hóa Đơn Mua Hàng (Purchase Bill)</option>
                                    <option value="PURCHASE_PAYMENT">Ủy Nhiệm Chi Mua Hàng</option>
                                    <option value="CASH_TRANSACTION">Giao Dịch Sổ Quỹ</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Tiêu đề yêu cầu <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="VD: Mua sắm máy chủ Dell PowerEdge..."
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Số tiền đề nghị (VNĐ) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1000"
                                    value={amount || ''}
                                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                    placeholder="VD: 75000000"
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold text-rose-600"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm"
                                >
                                    {saving ? 'Đang gửi...' : 'Gửi Yêu Cầu Duyệt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
