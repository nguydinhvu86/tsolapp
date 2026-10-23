'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { confirmModal } from '@/app/components/providers/ConfirmProvider';
import { toast } from '@/app/components/providers/ToastProvider';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { AvatarImage } from '@/app/components/ui/AvatarImage';
import { formatDate } from '@/lib/utils/formatters';
import { createUser, updateUser, deleteUser } from './actions';
import {
    Plus,
    Edit2,
    Trash2,
    KeyRound,
    Users,
    ShieldCheck,
    UserCheck,
    PhoneCall,
    Search,
    X,
    Shield,
    Mail,
    AlertCircle
} from 'lucide-react';

export function UserListClient({ initialUsers, permissionGroups = [] }: { initialUsers: any[], permissionGroups?: any[] }) {
    const router = useRouter();
    const [users, setUsers] = useState(initialUsers);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'USER',
        password: '',
        permissionGroupId: '',
        permissions: [] as string[],
        extension: '',
        sipPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // KPI metrics
    const totalUsers = users.length;
    const adminCount = users.filter((u: any) => u.role === 'ADMIN').length;
    const managerCount = users.filter((u: any) => {
        if (u.role === 'MANAGER') return true;
        const gName = (u.permissionGroup?.name || '').toLowerCase();
        return gName.includes('quản lý') || gName.includes('manager') || gName.includes('trưởng');
    }).length;
    const standardUsers = totalUsers - adminCount;
    const extCount = users.filter((u: any) => !!u.extension).length;

    // Filtered users
    const filteredUsers = useMemo(() => {
        return users.filter((u: any) => {
            const matchesSearch =
                (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.extension || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.permissionGroup?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;
            if (roleFilter === 'ALL') return true;
            if (roleFilter === 'ADMIN') return u.role === 'ADMIN';
            if (roleFilter === 'MANAGER') {
                const gName = (u.permissionGroup?.name || '').toLowerCase();
                return u.role === 'MANAGER' || gName.includes('quản lý') || gName.includes('manager');
            }
            if (roleFilter === 'EXT') return !!u.extension;
            return u.role !== 'ADMIN';
        });
    }, [users, searchTerm, roleFilter]);

    const openAddModal = () => {
        setFormData({
            name: '',
            email: '',
            role: 'USER',
            password: '',
            permissionGroupId: permissionGroups.find(g => g.name === 'Người dùng')?.id || '',
            permissions: [],
            extension: '',
            sipPassword: ''
        });
        setError('');
        setIsAddModalOpen(true);
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setFormData({
            name: user.name || '',
            email: user.email,
            role: user.role,
            password: '',
            permissionGroupId: user.permissionGroupId || '',
            permissions: user.permissions || [],
            extension: user.extension || '',
            sipPassword: user.sipPassword || ''
        });
        setError('');
        setIsEditModalOpen(true);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const newUser = await createUser(formData) as any;
            const groupName = permissionGroups.find(g => g.id === newUser.permissionGroupId)?.name;
            setUsers([
                {
                    ...newUser,
                    createdAt: newUser.createdAt ? new Date(newUser.createdAt).toISOString() : new Date().toISOString(),
                    permissionGroup: groupName ? { name: groupName } : undefined
                },
                ...users
            ]);
            setIsAddModalOpen(false);
            toast.success('Đã tạo tài khoản nhân sự mới thành công');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi tạo người dùng');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const updatedUser = await updateUser(editingUser.id, formData) as any;
            const groupName = permissionGroups.find(g => g.id === updatedUser.permissionGroupId)?.name;
            setUsers(users.map(u => u.id === editingUser.id ? {
                ...u,
                ...updatedUser,
                createdAt: u.createdAt,
                permissionGroup: groupName ? { name: groupName } : undefined
            } : u));
            setIsEditModalOpen(false);
            toast.success('Đã cập nhật thông tin nhân sự');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi cập nhật');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, email: string) => {
        if (await confirmModal(`Bạn có chắc chắn muốn xóa người dùng ${email}? Thao tác này không thể hoàn tác.`)) {
            try {
                await deleteUser(id);
                setUsers(prev => prev.filter(u => u.id !== id));
                toast.success('Đã xóa tài khoản người dùng');
            } catch (err: any) {
                toast.error(err.message || 'Có lỗi xảy ra khi xóa');
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* 1. Page Header (Đồng bộ chuẩn ERP) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            THIẾT LẬP HỆ THỐNG
                        </span>
                        <span className="text-slate-300 text-xs">|</span>
                        <span className="text-xs font-semibold text-slate-500">Tài khoản &amp; Phân quyền truy cập</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 m-0">
                            Quản Lý Nhân Sự &amp; Người Dùng
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 tabular-nums shadow-2xs">
                            {totalUsers}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Link
                        href="/users/roles"
                        className="inline-flex items-center gap-1.5 h-[36px] px-3.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        <Shield size={15} />
                        <span>Nhóm phân quyền</span>
                    </Link>
                    <button
                        type="button"
                        onClick={openAddModal}
                        style={{ backgroundColor: '#05A613' }}
                        className="inline-flex items-center gap-2 h-[36px] px-4 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus size={16} className="stroke-[3]" />
                        <span>Thêm Nhân Sự Mới</span>
                    </button>
                </div>
            </div>

            {/* 2. KPI Filter Cards (Đồng bộ hệ thống) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Card 1: Tổng Nhân Sự */}
                <div
                    onClick={() => setRoleFilter('ALL')}
                    style={roleFilter === 'ALL' ? { borderColor: '#7c3aed', backgroundColor: '#faf5ff', boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.15)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#7c3aed' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <Users size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Tổng nhân sự</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Tài khoản toàn hệ thống</p>
                            </div>
                        </div>
                        <span
                            style={roleFilter === 'ALL' ? { color: '#7c3aed' } : {}}
                            className="text-lg font-extrabold tabular-nums text-slate-800"
                        >
                            {totalUsers}
                        </span>
                    </div>
                </div>

                {/* Card 2: Quản Trị Viên */}
                <div
                    onClick={() => setRoleFilter(roleFilter === 'ADMIN' ? 'ALL' : 'ADMIN')}
                    style={roleFilter === 'ADMIN' ? { borderColor: '#0284c7', backgroundColor: '#f0f9ff', boxShadow: '0 0 0 2px rgba(2, 132, 199, 0.15)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#0284c7' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <ShieldCheck size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Quản trị viên</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Quyền quản trị toàn quyền</p>
                            </div>
                        </div>
                        <span
                            style={roleFilter === 'ADMIN' ? { color: '#0284c7' } : {}}
                            className="text-lg font-extrabold tabular-nums text-slate-800"
                        >
                            {adminCount}
                        </span>
                    </div>
                </div>

                {/* Card 3: Nhân Viên & Quản Lý */}
                <div
                    onClick={() => setRoleFilter(roleFilter === 'USER' ? 'ALL' : 'USER')}
                    style={roleFilter === 'USER' ? { borderColor: '#05A613', backgroundColor: '#ecfdf5', boxShadow: '0 0 0 2px rgba(5, 166, 19, 0.2)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#05A613' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <UserCheck size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Nhân viên tiêu chuẩn</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Theo nhóm phân quyền ({managerCount} quản lý)</p>
                            </div>
                        </div>
                        <span
                            style={roleFilter === 'USER' ? { color: '#05A613' } : {}}
                            className="text-lg font-extrabold tabular-nums text-slate-800"
                        >
                            {standardUsers}
                        </span>
                    </div>
                </div>

                {/* Card 4: Máy Nhánh (EXT) */}
                <div
                    onClick={() => setRoleFilter(roleFilter === 'EXT' ? 'ALL' : 'EXT')}
                    style={roleFilter === 'EXT' ? { borderColor: '#d97706', backgroundColor: '#fffbeb', boxShadow: '0 0 0 2px rgba(217, 119, 6, 0.15)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#d97706' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <PhoneCall size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight m-0">Máy nhánh (EXT)</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Đã cấp số nhánh Call Center</p>
                            </div>
                        </div>
                        <span
                            style={roleFilter === 'EXT' ? { color: '#d97706' } : {}}
                            className="text-lg font-extrabold tabular-nums text-slate-800"
                        >
                            {extCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Main Data Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    {/* Search Input */}
                    <div className="flex items-center w-full sm:w-[380px] h-[36px] bg-white border border-slate-300 rounded-lg px-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600/20 transition-all shadow-2xs">
                        <Search size={14} className="text-slate-400 shrink-0 mr-2" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm nhân sự theo tên, email, nhóm quyền, máy nhánh..."
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

                    {/* Right Filter Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                            {[
                                { key: 'ALL', label: 'Tất cả vai trò' },
                                { key: 'ADMIN', label: 'Quản trị viên' },
                                { key: 'MANAGER', label: 'Quản lý' },
                                { key: 'USER', label: 'Nhân viên' }
                            ].map((r) => (
                                <button
                                    key={r.key}
                                    type="button"
                                    onClick={() => setRoleFilter(r.key)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                        roleFilter === r.key
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                            Hiển thị <span className="text-slate-900 font-bold tabular-nums">{filteredUsers.length}</span> / {totalUsers} nhân sự
                        </span>
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200">
                                <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    Nhân sự
                                </th>
                                <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    Email đăng nhập
                                </th>
                                <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">
                                    Số nhánh (EXT)
                                </th>
                                <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    Nhóm quyền / Vai trò
                                </th>
                                <th className="py-3 px-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 text-xs">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-slate-500 bg-slate-50/20">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-10 h-10 text-slate-300 mb-2.5" strokeWidth={1.5} />
                                            <h3 className="text-xs font-bold text-slate-700 m-0">Không tìm thấy nhân sự phù hợp</h3>
                                            <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bấm nút &ldquo;Thêm Nhân Sự Mới&rdquo;.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user: any) => {
                                const groupLabel = user.permissionGroup?.name || (user.role === 'ADMIN' ? 'Admin' : user.role === 'MANAGER' ? 'Quản lý' : 'Người dùng');
                                const isUserAdmin = user.role === 'ADMIN' || groupLabel.toLowerCase() === 'admin';
                                const isUserManager = !isUserAdmin && (
                                    user.role === 'MANAGER' ||
                                    groupLabel.toLowerCase().includes('quản lý') ||
                                    groupLabel.toLowerCase().includes('manager') ||
                                    groupLabel.toLowerCase().includes('trưởng')
                                );

                                return (
                                    <tr key={user.id} className="hover:bg-emerald-50/35 transition-colors group">
                                        <td className="py-2.5 px-4 align-middle">
                                            <div className="flex items-center gap-3">
                                                <AvatarImage
                                                    src={user.avatar?.startsWith('http') ? user.avatar : user.avatar ? `/${user.avatar.replace(/^\//, '')}` : null}
                                                    name={user.name || user.email}
                                                    size={34}
                                                    className="border border-slate-200 shrink-0 shadow-2xs"
                                                />
                                                <div className="min-w-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(user)}
                                                        className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition-colors text-left cursor-pointer block truncate"
                                                    >
                                                        {user.name || '---'}
                                                    </button>
                                                    <span className="text-[11px] text-slate-400 block">
                                                        {user.createdAt ? `Tạo ngày ${formatDate(user.createdAt)}` : 'Tài khoản hệ thống'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-2.5 px-4 align-middle">
                                            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                                <Mail size={13} className="text-slate-400 shrink-0" />
                                                <span>{user.email}</span>
                                            </div>
                                        </td>

                                        <td className="py-2.5 px-4 align-middle text-center">
                                            {user.extension ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold tabular-nums">
                                                    EXT {user.extension}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 font-medium">--</span>
                                            )}
                                        </td>

                                        <td className="py-2.5 px-4 align-middle">
                                            <span
                                                style={{
                                                    backgroundColor: isUserAdmin ? '#ecfdf5' : isUserManager ? '#f0f9ff' : '#f8fafc',
                                                    color: isUserAdmin ? '#047857' : isUserManager ? '#0369a1' : '#334155',
                                                    borderColor: isUserAdmin ? '#a7f3d0' : isUserManager ? '#bae6fd' : '#e2e8f0'
                                                }}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs"
                                            >
                                                <span
                                                    style={{
                                                        backgroundColor: isUserAdmin ? '#10b981' : isUserManager ? '#0284c7' : '#94a3b8'
                                                    }}
                                                    className="w-1.5 h-1.5 rounded-full"
                                                />
                                                <span>{groupLabel}</span>
                                            </span>
                                        </td>

                                        <td className="py-2.5 px-4 align-middle text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(user)}
                                                    title="Chỉnh sửa nhân sự"
                                                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 transition-all cursor-pointer shadow-2xs"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(user.id, user.email)}
                                                    title="Xóa tài khoản"
                                                    className="w-7 h-7 rounded-lg inline-flex items-center justify-center bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shadow-2xs"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Thêm Mới */}
            {isAddModalOpen && (
                <UserModal
                    title="Thêm Nhân Sự Mới"
                    isEdit={false}
                    error={error}
                    formData={formData}
                    setFormData={setFormData}
                    permissionGroups={permissionGroups}
                    isLoading={isLoading}
                    onSubmit={handleCreate}
                    onClose={() => setIsAddModalOpen(false)}
                />
            )}

            {/* Modal Sửa */}
            {isEditModalOpen && (
                <UserModal
                    title="Chỉnh Sửa Thông Tin Nhân Sự"
                    isEdit={true}
                    error={error}
                    formData={formData}
                    setFormData={setFormData}
                    permissionGroups={permissionGroups}
                    isLoading={isLoading}
                    onSubmit={handleUpdate}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}
        </div>
    );
}

function UserModal({ title, isEdit, error, formData, setFormData, isLoading, onSubmit, onClose, permissionGroups }: any) {
    return (
        <div className="fixed inset-0 z-50 p-4 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                            <Users size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 m-0">{title}</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">Thiết lập thông tin tài khoản, nhóm quyền và tổng đài nội bộ</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form id="user-form" onSubmit={onSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Họ và tên nhân sự <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    label=""
                                    placeholder="Nhập họ và tên..."
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Email đăng nhập <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    label=""
                                    type="email"
                                    placeholder="user@tsol.vn"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Số nội bộ PBX (Extension)
                                </label>
                                <Input
                                    label=""
                                    placeholder="VD: 101"
                                    value={formData.extension || ''}
                                    onChange={e => setFormData({ ...formData, extension: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Mật khẩu WebRTC / SIP
                                </label>
                                <Input
                                    label=""
                                    placeholder="VD: 123456"
                                    value={formData.sipPassword || ''}
                                    onChange={e => setFormData({ ...formData, sipPassword: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Cấp độ tài khoản
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full h-9 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors cursor-pointer"
                                >
                                    <option value="USER">Nhân viên tiêu chuẩn (USER)</option>
                                    <option value="MANAGER">Cấp Quản lý (MANAGER)</option>
                                    <option value="ADMIN">Quản trị viên toàn hệ thống (ADMIN)</option>
                                </select>
                            </div>

                            {formData.role !== 'ADMIN' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Nhóm phân quyền <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={formData.permissionGroupId || ''}
                                        onChange={e => setFormData({ ...formData, permissionGroupId: e.target.value })}
                                        required={formData.role === 'USER'}
                                        className="w-full h-9 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors cursor-pointer"
                                    >
                                        <option value="" disabled>-- Chọn nhóm quyền --</option>
                                        {permissionGroups?.map((g: any) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}{g.description ? ` (${g.description})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                <KeyRound size={14} className="text-emerald-600" />
                                <span>Mật khẩu đăng nhập</span>
                            </div>
                            <Input
                                label=""
                                type="password"
                                placeholder={isEdit ? 'Bỏ trống nếu giữ nguyên mật khẩu hiện tại' : 'Mặc định: 123456 (nếu bỏ trống)'}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/60 flex items-center justify-end gap-2.5">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                        Hủy bỏ
                    </Button>
                    <Button type="submit" form="user-form" disabled={isLoading}>
                        {isLoading ? 'Đang lưu...' : 'Lưu thông tin'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
