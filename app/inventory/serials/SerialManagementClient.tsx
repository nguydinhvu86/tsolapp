'use client'

import React, { useState, useEffect } from 'react';
import { 
    QrCode, 
    Search, 
    Plus, 
    ShieldCheck, 
    ShieldAlert, 
    CheckCircle2, 
    Package, 
    User, 
    FileText, 
    Clock, 
    RefreshCw,
    X,
    Filter
} from 'lucide-react';
import { fetchSerials, createSerialRecord, lookupWarranty } from './actions';

export default function SerialManagementClient() {
    const [serials, setSerials] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [productFilter, setProductFilter] = useState('');

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [newSerial, setNewSerial] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Lookup modal state
    const [lookupSearch, setLookupSearch] = useState('');
    const [lookupResult, setLookupResult] = useState<any>(null);
    const [lookingUp, setLookingUp] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const res = await fetchSerials({
            search,
            status: statusFilter,
            productId: productFilter || undefined
        });
        if (res.success) {
            setSerials(res.serials || []);
            setProducts(res.products || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [statusFilter, productFilter]);

    const handleCreateSerial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId || !newSerial.trim()) {
            alert('Vui lòng chọn sản phẩm và nhập số Serial');
            return;
        }

        setSaving(true);
        const res = await createSerialRecord({
            productId: selectedProductId,
            serialNumber: newSerial.trim(),
            notes: newNotes
        });
        setSaving(false);

        if (res.success) {
            setShowAddModal(false);
            setNewSerial('');
            setNewNotes('');
            loadData();
        } else {
            alert(res.error || 'Lỗi khi tạo Serial');
        }
    };

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lookupSearch.trim()) return;
        setLookingUp(true);
        const res = await lookupWarranty(lookupSearch);
        setLookingUp(false);
        if (res.success) {
            setLookupResult(res.data);
        } else {
            alert(res.error || 'Không tìm thấy thông tin Serial');
            setLookupResult(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'IN_STOCK':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Tồn kho</span>;
            case 'SOLD':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Đã xuất bán</span>;
            case 'UNDER_WARRANTY':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Đang bảo hành</span>;
            case 'DEFECTIVE':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">Lỗi / Hỏng</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                        <QrCode className="w-5 h-5" /> Quản Trị Kho Nâng Cao (Advanced WMS)
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Quản Lý Mã Định Danh Serial / IMEI & Bảo Hành</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Theo dõi vòng đời từng thiết bị từ lúc nhập kho, xuất bán đến bảo hành điện tử chính xác
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" /> Thêm Serial Mới
                    </button>
                </div>
            </div>

            {/* Electronic Warranty Quick Lookup Banner */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Tra Cứu Nhanh Bảo Hành Điện Tử Theo Serial / IMEI
                </h2>
                <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                    <input
                        type="text"
                        placeholder="Nhập số Serial/IMEI (VD: SN-KAM-2026-99)..."
                        value={lookupSearch}
                        onChange={(e) => setLookupSearch(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <button
                        type="submit"
                        disabled={lookingUp}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {lookingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Kiểm tra bảo hành
                    </button>
                </form>

                {lookupResult && (
                    <div className="mt-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
                        <div>
                            <span className="text-xs text-slate-400 font-medium">Sản phẩm</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{lookupResult.productName}</p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 font-medium">Trạng thái bảo hành</span>
                            <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-4 h-4" /> Còn bảo hành ({lookupResult.remainingDays} ngày)
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 font-medium">Hạn bảo hành</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{new Date(lookupResult.warrantyEndDate).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-400 font-medium">Khách hàng sở hữu</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{lookupResult.customerName || 'Chưa gán'}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo Serial, tên sản phẩm, ghi chú..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadData()}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="IN_STOCK">Tồn kho (In Stock)</option>
                        <option value="SOLD">Đã xuất bán (Sold)</option>
                        <option value="UNDER_WARRANTY">Đang bảo hành</option>
                        <option value="DEFECTIVE">Lỗi / Hỏng</option>
                    </select>

                    <select
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none max-w-[200px]"
                    >
                        <option value="">Tất cả sản phẩm</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={loadData}
                        className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-slate-600 dark:text-slate-300"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {serials.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <QrCode className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="font-semibold text-base">Chưa có mã Serial/IMEI nào</p>
                        <p className="text-sm mt-1">Bấm "Thêm Serial Mới" để tạo mã định danh theo dõi thiết bị trong kho.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold">
                                    <th className="py-3 px-4">Số Serial / IMEI</th>
                                    <th className="py-3 px-4">Sản Phẩm</th>
                                    <th className="py-3 px-4">Trạng Thái</th>
                                    <th className="py-3 px-4">Khách Hàng Mua</th>
                                    <th className="py-3 px-4">Hạn Bảo Hành</th>
                                    <th className="py-3 px-4">Ghi Chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serials.map((s) => (
                                    <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                                            {s.serialNumber}
                                        </td>
                                        <td className="py-3 px-4">
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{s.product?.name}</p>
                                            <span className="text-xs text-slate-400">Mã: {s.product?.code}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {getStatusBadge(s.status)}
                                        </td>
                                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                            {s.customer ? (
                                                <div>
                                                    <p className="font-medium">{s.customer.name}</p>
                                                    <span className="text-xs text-slate-400">{s.customer.phone}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Chưa xuất bán</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                            {s.warrantyEndDate ? (
                                                <span className="font-medium">{new Date(s.warrantyEndDate).toLocaleDateString('vi-VN')}</span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 text-xs max-w-[200px] truncate">
                                            {s.notes || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Serial Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Thêm Serial / IMEI Mới</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSerial} className="space-y-4 text-sm">
                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Chọn Sản phẩm <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                >
                                    <option value="">-- Chọn sản phẩm --</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Số Serial / IMEI <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newSerial}
                                    onChange={(e) => setNewSerial(e.target.value)}
                                    placeholder="VD: SN-2026-CAMERA-001"
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-mono"
                                />
                            </div>

                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Ghi chú
                                </label>
                                <textarea
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    placeholder="Vị trí kệ, lô sản xuất..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm"
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu Serial'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
