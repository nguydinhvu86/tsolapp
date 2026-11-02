'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Ruler, 
    Plus, 
    Search, 
    Edit2, 
    Trash2, 
    Star, 
    Package, 
    Check, 
    AlertCircle, 
    RefreshCw,
    Layers,
    ArrowUpRight
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { toast } from '@/app/components/providers/ToastProvider';
import { getUnits, createUnit, updateUnit, deleteUnit } from './actions';

export default function UnitClient() {
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<any | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [syncProducts, setSyncProducts] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete modal
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getUnits();
            setUnits(data);
        } catch (error) {
            toast.error('Không thể tải danh sách đơn vị tính!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenCreate = () => {
        setEditingUnit(null);
        setName('');
        setDescription('');
        setIsDefault(false);
        setSyncProducts(true);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (unit: any) => {
        setEditingUnit(unit);
        setName(unit.name);
        setDescription(unit.description || '');
        setIsDefault(!!unit.isDefault);
        setSyncProducts(true);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanName = name.trim();
        if (!cleanName) {
            toast.error('Vui lòng nhập tên đơn vị tính!');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingUnit) {
                await updateUnit(editingUnit.id, {
                    name: cleanName,
                    description: description.trim(),
                    isDefault
                }, syncProducts);
                toast.success(`Đã cập nhật đơn vị tính "${cleanName}" thành công!`);
            } else {
                await createUnit({
                    name: cleanName,
                    description: description.trim(),
                    isDefault
                });
                toast.success(`Đã thêm mới đơn vị tính "${cleanName}" thành công!`);
            }
            setIsModalOpen(false);
            await loadData();
        } catch (error: any) {
            toast.error(error.message || 'Có lỗi xảy ra khi lưu đơn vị tính!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetDefault = async (unit: any) => {
        if (unit.isDefault) return;
        try {
            await updateUnit(unit.id, {
                name: unit.name,
                description: unit.description,
                isDefault: true
            }, false);
            toast.success(`Đã đặt "${unit.name}" làm đơn vị tính mặc định!`);
            await loadData();
        } catch (error: any) {
            toast.error(error.message || 'Không thể đặt mặc định!');
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteUnit(deleteTarget.id);
            toast.success(`Đã xóa đơn vị tính "${deleteTarget.name}"!`);
            setDeleteTarget(null);
            await loadData();
        } catch (error: any) {
            toast.error(error.message || 'Không thể xóa đơn vị tính!');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredUnits = units.filter(u => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return u.name.toLowerCase().includes(q) || (u.description && u.description.toLowerCase().includes(q));
    });

    const defaultUnit = units.find(u => u.isDefault);
    const totalProductsCount = units.reduce((acc, u) => acc + (u.productCount || 0), 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                        <Ruler size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-bold text-slate-800">Quản Lý Đơn Vị Tính</h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                {units.length} đơn vị
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Quy chuẩn danh mục đơn vị đo lường cho sản phẩm, dịch vụ và hàng hóa trong toàn hệ thống
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="h-10 px-3.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                        title="Tải lại danh sách"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Làm mới</span>
                    </button>
                    <Link
                        href="/inventory/unit-conversions"
                        className="h-10 px-3.5 bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200/60 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                        <Layers size={14} />
                        <span>Quy Đổi Đa Cấp</span>
                    </Link>
                    <button
                        onClick={handleOpenCreate}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                        <Plus size={16} />
                        <span>Thêm Đơn Vị Tính</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng Đơn Vị Tính</p>
                        <h3 className="text-2xl font-black text-slate-800 mt-0.5">{units.length}</h3>
                        <p className="text-[11px] text-slate-400 mt-1">Sẵn sàng áp dụng cho kho & bán hàng</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Ruler size={20} />
                    </div>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đơn Vị Mặc Định</p>
                        <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{defaultUnit?.name || 'Cái'}</h3>
                        <p className="text-[11px] text-emerald-600/80 mt-1">Tự động chọn khi tạo sản phẩm mới</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Star size={20} className="fill-emerald-600" />
                    </div>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sản Phẩm Đang Sử Dụng</p>
                        <h3 className="text-2xl font-black text-blue-700 mt-0.5">{totalProductsCount}</h3>
                        <p className="text-[11px] text-blue-600/80 mt-1">Sản phẩm & dịch vụ trong danh mục</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Package size={20} />
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm theo tên đơn vị tính, mô tả..."
                        className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                    Hiển thị <span className="font-bold text-slate-800">{filteredUnits.length}</span> / {units.length} đơn vị
                </div>
            </div>

            {/* Units Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <th className="py-3 px-4 w-12 text-center">#</th>
                                <th className="py-3 px-4 min-w-[160px]">Tên Đơn Vị Tính</th>
                                <th className="py-3 px-4 min-w-[200px]">Mô Tả / Ghi Chú</th>
                                <th className="py-3 px-4 text-center min-w-[140px]">Số SP Đang Dùng</th>
                                <th className="py-3 px-4 text-center min-w-[130px]">Trạng Thái</th>
                                <th className="py-3 px-4 min-w-[140px]">Ngày Tạo</th>
                                <th className="py-3 px-4 text-right min-w-[120px]">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw size={16} className="animate-spin text-emerald-600" />
                                            <span>Đang tải danh sách đơn vị tính...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUnits.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        {searchTerm ? (
                                            <div>Không tìm thấy đơn vị tính nào phù hợp với từ khóa &quot;{searchTerm}&quot;</div>
                                        ) : (
                                            <div>Chưa có đơn vị tính nào trong hệ thống. Hãy bấm &quot;Thêm Đơn Vị Tính&quot; để tạo mới!</div>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredUnits.map((u, idx) => (
                                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                                            {idx + 1}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-[13px] bg-slate-100/80 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg border border-slate-200/60 transition-colors">
                                                    {u.name}
                                                </span>
                                                {u.isDefault && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <Star size={10} className="fill-amber-600" /> Mặc định
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-500">
                                            {u.description || <span className="text-slate-300 italic">Chưa có mô tả</span>}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            {u.productCount > 0 ? (
                                                <Link
                                                    href={`/inventory/products?search=${encodeURIComponent(u.name)}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                                                    title={`Xem các sản phẩm có đơn vị tính ${u.name}`}
                                                >
                                                    <Package size={12} />
                                                    <span>{u.productCount} SP</span>
                                                    <ArrowUpRight size={11} className="opacity-60" />
                                                </Link>
                                            ) : (
                                                <span className="text-slate-400 text-[11px]">0 SP</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            {u.isDefault ? (
                                                <span className="text-emerald-700 font-semibold text-[11px] inline-flex items-center gap-1">
                                                    <Check size={13} className="text-emerald-600" /> Đang mặc định
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleSetDefault(u)}
                                                    className="text-slate-500 hover:text-amber-600 hover:bg-amber-50 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                                                >
                                                    Đặt mặc định
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '-'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleOpenEdit(u)}
                                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Chỉnh sửa đơn vị tính"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(u)}
                                                    disabled={u.isDefault || u.productCount > 0}
                                                    className={`p-1.5 rounded-lg transition-colors ${
                                                        u.isDefault || u.productCount > 0 
                                                            ? 'text-slate-300 cursor-not-allowed' 
                                                            : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer'
                                                    }`}
                                                    title={
                                                        u.isDefault 
                                                            ? 'Không thể xóa đơn vị tính mặc định' 
                                                            : (u.productCount > 0 ? `Đang có ${u.productCount} sản phẩm sử dụng đơn vị này` : 'Xóa đơn vị tính')
                                                    }
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Create / Edit */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUnit ? `Chỉnh Sửa Đơn Vị Tính: ${editingUnit.name}` : 'Thêm Mới Đơn Vị Tính'}
                maxWidth="550px"
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Tên Đơn Vị Tính <span className="text-rose-500">*</span>
                        </label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="VD: Cái, Bộ, Hộp, Mét, Cuộn, Kg, Lít..."
                            required
                            autoFocus
                            className="h-10 text-xs font-semibold rounded-xl"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                            Tên ngắn gọn, chuẩn quy cách hiển thị trên hóa đơn, báo giá và bảng kê sản phẩm.
                        </p>
                    </div>

                    <div>
                        <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Mô Tả / Ghi Chú (Tùy chọn)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Ghi chú quy cách hoặc phạm vi sử dụng của đơn vị tính này..."
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                        />
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-700">
                                Đặt làm đơn vị tính mặc định khi tạo sản phẩm mới
                            </span>
                        </label>

                        {editingUnit && editingUnit.productCount > 0 && (
                            <label className="flex items-start gap-2.5 cursor-pointer bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
                                <input
                                    type="checkbox"
                                    checked={syncProducts}
                                    onChange={(e) => setSyncProducts(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5 cursor-pointer"
                                />
                                <div className="text-xs text-amber-900 leading-relaxed">
                                    <span className="font-bold">Tự động cập nhật tên mới</span> cho toàn bộ <strong>{editingUnit.productCount} sản phẩm</strong> đang sử dụng đơn vị tính cũ &quot;{editingUnit.name}&quot;.
                                </div>
                            </label>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isSubmitting}
                            className="h-10 px-4 text-xs font-semibold"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                        >
                            {isSubmitting ? 'Đang lưu...' : (editingUnit ? 'Lưu Thay Đổi' : 'Tạo Đơn Vị Tính')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Xác Nhận Xóa Đơn Vị Tính"
                maxWidth="450px"
            >
                <div className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                        <AlertCircle size={24} />
                    </div>
                    <div className="text-center">
                        <h4 className="text-base font-bold text-slate-800">
                            Xóa đơn vị tính &quot;{deleteTarget?.name}&quot;?
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Hành động này không thể hoàn tác. Đơn vị tính sẽ bị xóa vĩnh viễn khỏi danh mục hệ thống.
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDeleteTarget(null)}
                            disabled={isDeleting}
                            className="h-9 px-4 text-xs font-semibold"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
                        >
                            {isDeleting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
