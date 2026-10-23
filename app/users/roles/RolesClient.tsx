'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/app/components/providers/ToastProvider';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { createPermissionGroup, updatePermissionGroup, deletePermissionGroup } from '../actions';
import { RESOURCES, ACTIONS, PermissionHelper } from '@/lib/permissions';
import {
    Shield,
    Plus,
    Edit2,
    Trash2,
    Search,
    Lock,
    Sliders,
    AlertCircle,
    X,
    Users
} from 'lucide-react';

export function RolesClient({ initialGroups }: { initialGroups: any[] }) {
    const router = useRouter();
    const [groups, setGroups] = useState(initialGroups);
    const [searchTerm, setSearchTerm] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', description: '', permissions: [] as string[] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const filteredGroups = useMemo(() => {
        return groups.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [groups, searchTerm]);

    const systemRolesCount = useMemo(() => groups.filter(g => g.isSystem).length, [groups]);
    const customRolesCount = useMemo(() => groups.filter(g => !g.isSystem).length, [groups]);

    const openAddModal = () => {
        setFormData({ name: '', description: '', permissions: [] });
        setError('');
        setIsAddModalOpen(true);
    };

    const openEditModal = (group: any) => {
        setEditingGroup(group);
        setFormData({ name: group.name, description: group.description || '', permissions: group.permissions || [] });
        setError('');
        setIsEditModalOpen(true);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await createPermissionGroup(formData);
            setIsAddModalOpen(false);
            toast.success('Đã tạo nhóm quyền mới');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi tạo nhóm quyền');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await updatePermissionGroup(editingGroup.id, formData);
            setIsEditModalOpen(false);
            toast.success('Đã cập nhật nhóm quyền');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi cập nhật');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Bạn có chắc muốn xóa nhóm quyền "${name}"? Thao tác này có thể gỡ vai trò của các tài khoản đang thuộc nhóm.`)) {
            try {
                await deletePermissionGroup(id);
                setGroups(prev => prev.filter(g => g.id !== id));
                toast.success('Đã xóa nhóm quyền');
            } catch (err: any) {
                toast.error(err.message || 'Lỗi khi xóa nhóm quyền');
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* 1. Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            THIẾT LẬP HỆ THỐNG
                        </span>
                        <span className="text-slate-300 text-xs">|</span>
                        <span className="text-xs font-semibold text-slate-500">Ma trận phân quyền &amp; Vai trò</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 m-0">
                            Quản Lý Nhóm Quyền (Vai Trò)
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 tabular-nums shadow-2xs">
                            {groups.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Link
                        href="/users"
                        className="inline-flex items-center gap-1.5 h-[36px] px-3.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        <Users size={15} />
                        <span>Danh sách nhân sự</span>
                    </Link>
                    <button
                        type="button"
                        onClick={openAddModal}
                        style={{ backgroundColor: '#05A613' }}
                        className="inline-flex items-center gap-2 h-[36px] px-4 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus size={16} className="stroke-[3]" />
                        <span>Tạo Nhóm Quyền Mới</span>
                    </button>
                </div>
            </div>

            {/* 2. KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: '#7c3aed' }} className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0">
                            <Users size={20} className="stroke-[2.2]" />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Tổng nhóm quyền</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">Các nhóm vai trò hệ thống</p>
                        </div>
                    </div>
                    <span className="text-lg font-extrabold tabular-nums text-slate-800">{groups.length}</span>
                </div>

                <div className="rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: '#0284c7' }} className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0">
                            <Lock size={20} className="stroke-[2.2]" />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Nhóm mặc định</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">Nhóm chuẩn của hệ thống</p>
                        </div>
                    </div>
                    <span className="text-lg font-extrabold tabular-nums text-slate-800">{systemRolesCount}</span>
                </div>

                <div className="rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: '#05A613' }} className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0">
                            <Sliders size={20} className="stroke-[2.2]" />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Nhóm tùy chỉnh</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">Thiết lập theo phòng ban</p>
                        </div>
                    </div>
                    <span className="text-lg font-extrabold tabular-nums text-slate-800">{customRolesCount}</span>
                </div>
            </div>

            {/* 3. Main Table Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="flex items-center w-full sm:w-[380px] h-[36px] bg-white border border-slate-300 rounded-lg px-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600/20 transition-all shadow-2xs">
                        <Search size={14} className="text-slate-400 shrink-0 mr-2" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm nhóm quyền theo tên hoặc mô tả..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                            className="w-full h-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer shrink-0 ml-1"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <span className="text-[11px] font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                        Hiển thị <span className="text-slate-900 font-bold tabular-nums">{filteredGroups.length}</span> / {groups.length} nhóm quyền
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200">
                                <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tên nhóm quyền</th>
                                <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Mô tả chức năng</th>
                                <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">Phân loại</th>
                                <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">Số quyền hạn</th>
                                <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 text-xs">
                            {filteredGroups.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Shield className="w-8 h-8 text-slate-300" />
                                            <p className="text-xs font-bold text-slate-700 m-0">Không tìm thấy nhóm quyền phù hợp</p>
                                            <p className="text-xs text-slate-400 m-0">Thử thay đổi từ khóa tìm kiếm</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredGroups.map((group: any) => {
                                    const permCount = Array.isArray(group.permissions) ? group.permissions.length : 0;
                                    return (
                                        <tr key={group.id} className="hover:bg-emerald-50/35 transition-colors group">
                                            <td className="py-2.5 px-4 align-middle">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(group)}
                                                    className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition-colors text-left flex items-center gap-2.5 cursor-pointer"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                                                        <Shield className="w-4 h-4" />
                                                    </div>
                                                    <span>{group.name}</span>
                                                </button>
                                            </td>
                                            <td className="py-2.5 px-4 align-middle text-slate-600 max-w-md truncate">
                                                {group.description || <span className="text-slate-400 italic">Chưa có mô tả</span>}
                                            </td>
                                            <td className="py-2.5 px-4 align-middle text-center">
                                                {group.isSystem ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                                        <Lock className="w-3 h-3" /> Mặc định
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                        <Sliders className="w-3 h-3" /> Tùy chỉnh
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-4 align-middle text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs tabular-nums font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                                                    {permCount} quyền
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-4 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(group)}
                                                        title="Chỉnh sửa nhóm quyền"
                                                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition-all cursor-pointer shadow-2xs"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {!group.isSystem && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(group.id, group.name)}
                                                            title="Xóa nhóm quyền"
                                                            className="w-7 h-7 rounded-lg inline-flex items-center justify-center bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shadow-2xs"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Thêm Mới */}
            {isAddModalOpen && (
                <RoleModal
                    title="Thêm Nhóm Quyền Mới"
                    isSystem={false}
                    error={error}
                    formData={formData}
                    setFormData={setFormData}
                    isLoading={isLoading}
                    onSubmit={handleCreate}
                    onClose={() => setIsAddModalOpen(false)}
                />
            )}

            {/* Modal Sửa */}
            {isEditModalOpen && (
                <RoleModal
                    title={editingGroup?.isSystem ? 'Sửa Phân Quyền (Nhóm Mặc Định)' : 'Chỉnh Sửa Nhóm Quyền'}
                    isSystem={editingGroup?.isSystem}
                    error={error}
                    formData={formData}
                    setFormData={setFormData}
                    isLoading={isLoading}
                    onSubmit={handleUpdate}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}
        </div>
    );
}

function RoleModal({ title, isSystem, error, formData, setFormData, isLoading, onSubmit, onClose }: any) {
    return (
        <div className="fixed inset-0 z-50 p-4 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                            <Shield className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 m-0">{title}</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">Cấu hình các quyền hạn và phạm vi truy cập hệ thống</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form id="role-form" onSubmit={onSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <Input
                                label="Tên nhóm quyền"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                disabled={isSystem}
                                placeholder="VD: Trưởng phòng Kinh Doanh"
                            />
                            <Input
                                label="Mô tả tham khảo"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="VD: Quyền duyệt đơn hàng và xem báo cáo..."
                            />
                        </div>

                        {/* Ma trận phân quyền */}
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3.5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 m-0 uppercase tracking-wider">
                                    <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                                    Ma Trận Thiết Lập Phân Quyền
                                </h4>
                            </div>

                            {/* Quyền hệ thống đặc thù */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-white rounded-xl border border-slate-200/80">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold">
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions.includes(PermissionHelper.VIEW_DASHBOARD)}
                                        onChange={(e) => {
                                            if (e.target.checked) setFormData({ ...formData, permissions: [...formData.permissions, PermissionHelper.VIEW_DASHBOARD] });
                                            else setFormData({ ...formData, permissions: formData.permissions.filter((p: string) => p !== PermissionHelper.VIEW_DASHBOARD) });
                                        }}
                                        className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span>Bảng điều khiển (Dashboard)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold">
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions.includes(PermissionHelper.VIEW_EXECUTIVE_BI)}
                                        onChange={(e) => {
                                            if (e.target.checked) setFormData({ ...formData, permissions: [...formData.permissions, PermissionHelper.VIEW_EXECUTIVE_BI] });
                                            else setFormData({ ...formData, permissions: formData.permissions.filter((p: string) => p !== PermissionHelper.VIEW_EXECUTIVE_BI) });
                                        }}
                                        className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span>Executive BI &amp; Dự Báo (Quản lý+)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold">
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions.includes(PermissionHelper.USE_SOFTPHONE)}
                                        onChange={(e) => {
                                            if (e.target.checked) setFormData({ ...formData, permissions: [...formData.permissions, PermissionHelper.USE_SOFTPHONE] });
                                            else setFormData({ ...formData, permissions: formData.permissions.filter((p: string) => p !== PermissionHelper.USE_SOFTPHONE) });
                                        }}
                                        className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span>Tổng Đài WebRTC (Softphone)</span>
                                </label>
                            </div>

                            {/* Resource Table */}
                            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200/80">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider">
                                            <th className="p-2.5 font-bold">Tài nguyên hệ thống</th>
                                            {ACTIONS.map(action => (
                                                <th key={action.id} className="p-2.5 font-bold text-center">
                                                    {action.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {RESOURCES.map(res => (
                                            <tr key={res.id} className="hover:bg-slate-50/50">
                                                <td className="p-2.5 font-semibold text-slate-800">{res.name}</td>
                                                {ACTIONS.map(action => {
                                                    const permCode = PermissionHelper.generateCode(res.id, action.id);
                                                    const isChecked = formData.permissions.includes(permCode);
                                                    return (
                                                        <td key={action.id} className="p-2.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setFormData({ ...formData, permissions: [...formData.permissions, permCode] });
                                                                    } else {
                                                                        setFormData({ ...formData, permissions: formData.permissions.filter((p: string) => p !== permCode) });
                                                                    }
                                                                }}
                                                                className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                                            />
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 bg-slate-50/60">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                        Hủy
                    </Button>
                    <Button type="submit" form="role-form" disabled={isLoading}>
                        {isLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
