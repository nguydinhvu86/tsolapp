'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { 
    Shield, 
    Plus, 
    Edit2, 
    Trash2, 
    Search, 
    Lock, 
    Sliders, 
    CheckCircle2, 
    AlertCircle,
    X,
    Users
} from 'lucide-react';
import { createPermissionGroup, updatePermissionGroup, deletePermissionGroup } from '../actions';
import { useRouter } from 'next/navigation';
import { RESOURCES, ACTIONS, PermissionHelper } from '@/lib/permissions';

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
            } catch (err: any) {
                alert(err.message || 'Lỗi khi xóa nhóm quyền');
            }
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Quản Lý Nhóm Quyền</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {groups.length} Nhóm
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Phân quyền chi tiết chức năng và tài nguyên hệ thống cho từng vai trò người dùng</p>
                    </div>
                </div>

                <Button onClick={openAddModal} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
                    <Plus className="w-4 h-4" /> Tạo nhóm quyền mới
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng nhóm quyền</div>
                        <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{groups.length}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nhóm mặc định</div>
                        <div className="text-2xl font-mono font-bold text-indigo-600 mt-1">{systemRolesCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Lock className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nhóm tùy chỉnh</div>
                        <div className="text-2xl font-mono font-bold text-emerald-600 mt-1">{customRolesCount}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Sliders className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm nhóm quyền theo tên hoặc mô tả..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <th className="py-3.5 px-4 font-semibold">Tên Nhóm Quyền</th>
                                <th className="py-3.5 px-4 font-semibold">Mô Tả Chức Năng</th>
                                <th className="py-3.5 px-4 font-semibold text-center">Phân Loại</th>
                                <th className="py-3.5 px-4 font-semibold text-center">Số Quyền Hạn</th>
                                <th className="py-3.5 px-4 font-semibold text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredGroups.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Shield className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">Không tìm thấy nhóm quyền phù hợp</p>
                                            <p className="text-xs text-slate-400">Thử thay đổi từ khóa tìm kiếm</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredGroups.map((group: any) => {
                                    const permCount = Array.isArray(group.permissions) ? group.permissions.length : 0;
                                    return (
                                        <tr key={group.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <button 
                                                    onClick={() => openEditModal(group)} 
                                                    className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left flex items-center gap-2"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                                        <Shield className="w-4 h-4" />
                                                    </div>
                                                    <span>{group.name}</span>
                                                </button>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 max-w-md truncate">
                                                {group.description || <span className="text-slate-400 italic">Chưa có mô tả</span>}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {group.isSystem ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                                        <Lock className="w-3 h-3" /> Mặc định
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                        <Sliders className="w-3 h-3" /> Tùy chỉnh
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-slate-100 text-slate-700">
                                                    {permCount} quyền
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => openEditModal(group)} 
                                                        title="Chỉnh sửa nhóm quyền"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {!group.isSystem && (
                                                        <button 
                                                            onClick={() => handleDelete(group.id, group.name)} 
                                                            title="Xóa nhóm quyền"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 p-4 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">{title}</h3>
                            <p className="text-xs text-slate-500">Cấu hình các quyền hạn và phạm vi truy cập hệ thống</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {error && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form id="role-form" onSubmit={onSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-indigo-600" />
                                    Ma Trận Thiết Lập Phân Quyền
                                </h4>
                            </div>

                            {/* Quyền hệ thống đặc thù */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-slate-200/80">
                                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-medium">
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions.includes(PermissionHelper.VIEW_DASHBOARD)}
                                        onChange={(e) => {
                                            if (e.target.checked) setFormData({ ...formData, permissions: [...formData.permissions, PermissionHelper.VIEW_DASHBOARD] });
                                            else setFormData({ ...formData, permissions: formData.permissions.filter((p: string) => p !== PermissionHelper.VIEW_DASHBOARD) });
                                        }}
                                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span>Truy cập Bảng điều khiển (Dashboard)</span>
                                </label>
                                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-medium">
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions.includes(PermissionHelper.USE_SOFTPHONE)}
                                        onChange={(e) => {
                                            if (e.target.checked) setFormData({ ...formData, permissions: [...formData.permissions, PermissionHelper.USE_SOFTPHONE] });
                                            else setFormData({ ...formData, permissions: formData.permissions.filter((p: string) => p !== PermissionHelper.USE_SOFTPHONE) });
                                        }}
                                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span>Sử dụng Tổng Đài WebRTC (Softphone)</span>
                                </label>
                            </div>

                            {/* Resource Table */}
                            <div className="overflow-x-auto bg-white rounded-lg border border-slate-200/80">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                            <th className="p-3 font-semibold">Tài Nguyên Hệ Thống</th>
                                            {ACTIONS.map(action => (
                                                <th key={action.id} className="p-3 font-semibold text-center">
                                                    {action.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {RESOURCES.map(res => (
                                            <tr key={res.id} className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-800">{res.name}</td>
                                                {ACTIONS.map(action => {
                                                    const permCode = PermissionHelper.generateCode(res.id, action.id);
                                                    const isChecked = formData.permissions.includes(permCode);
                                                    return (
                                                        <td key={action.id} className="p-3 text-center">
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
                                                                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
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
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/50">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                        Hủy
                    </Button>
                    <Button type="submit" form="role-form" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
