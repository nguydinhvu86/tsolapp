'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Plus, Edit2, Trash2, KeyRound, Users, ShieldCheck, UserCheck, PhoneCall, Search } from 'lucide-react';
import { createUser, updateUser, deleteUser } from './actions';
import { useRouter } from 'next/navigation';
import { RESOURCES, ACTIONS, PermissionHelper } from '@/lib/permissions';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

export function UserListClient({ initialUsers, permissionGroups = [] }: { initialUsers: any[], permissionGroups?: any[] }) {
    const router = useRouter();
    const [users, setUsers] = useState(initialUsers);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', email: '', role: 'USER', password: '', permissionGroupId: '', permissions: [] as string[], extension: '', sipPassword: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // KPI metrics
    const totalUsers = users.length;
    const adminCount = users.filter((u: any) => u.role === 'ADMIN').length;
    const standardUsers = totalUsers - adminCount;
    const extCount = users.filter((u: any) => !!u.extension).length;

    // Filtered users
    const filteredUsers = useMemo(() => {
        return users.filter((u: any) => {
            const matchesSearch = 
                (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.extension || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

    const openAddModal = () => {
        setFormData({ name: '', email: '', role: 'USER', password: '', permissionGroupId: permissionGroups.find(g => g.name === 'Người dùng')?.id || '', permissions: [], extension: '', sipPassword: '' });
        setError('');
        setIsAddModalOpen(true);
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setFormData({ name: user.name || '', email: user.email, role: user.role, password: '', permissionGroupId: user.permissionGroupId || '', permissions: user.permissions || [], extension: user.extension || '', sipPassword: user.sipPassword || '' });
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
            setUsers([{ ...newUser, permissionGroup: { name: groupName } }, ...users]);
            setIsAddModalOpen(false);
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
            setUsers(users.map(u => u.id === editingUser.id ? { ...updatedUser, permissionGroup: { name: groupName } } : u));
            setIsEditModalOpen(false);
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi cập nhật');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, email: string) => {
        if (confirm(`Bạn có chắc chắn muốn xóa người dùng ${email}? Nghịch lý này không thể hoàn tác.`)) {
            try {
                await deleteUser(id);
                setUsers(prev => prev.filter(u => u.id !== id));
            } catch (err: any) {
                alert(err.message || 'Có lỗi xảy ra khi xóa');
            }
        }
    };

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                        Quản Lý Nhân Sự & Người Dùng
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Tạo tài khoản, gán nhóm quyền, cấu hình máy nhánh tổng đài (SIP/EXT) và kiểm soát bảo mật
                    </p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs shadow-emerald-200 transition-all cursor-pointer"
                >
                    <Plus size={15} /> Thêm Nhân Sự Mới
                </button>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tổng Nhân Sự</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-slate-900">{totalUsers}</span>
                            <span className="text-xs text-slate-400 font-medium">tài khoản</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Toàn hệ thống</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                        <Users size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-indigo-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Quản Trị Viên</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-indigo-600">{adminCount}</span>
                            <span className="text-xs text-slate-400 font-medium">admin</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Quyền quản trị toàn quyền</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <ShieldCheck size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-emerald-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nhân Viên Tiêu Chuẩn</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-emerald-600">{standardUsers}</span>
                            <span className="text-xs text-slate-400 font-medium">user</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Theo nhóm phân quyền</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <UserCheck size={22} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between hover:border-amber-200 transition-all">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Máy Nhánh (EXT)</div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-bold font-mono text-amber-600">{extCount}</span>
                            <span className="text-xs text-slate-400 font-medium">tổng đài</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 font-medium">Đã cấp số nhánh Call Center</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                        <PhoneCall size={22} />
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Tìm kiếm nhân sự theo tên, email, máy nhánh..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            {['ALL', 'ADMIN', 'USER'].map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRoleFilter(r)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                        roleFilter === r 
                                            ? 'bg-white text-slate-900 shadow-xs' 
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    {r === 'ALL' ? 'Tất cả vai trò' : r === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}
                                </button>
                            ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2.5 py-1 rounded-full">
                            {filteredUsers.length} nhân sự
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Nhân Sự</th>
                                <th className="px-4 py-3 text-left">Email Đăng Nhập</th>
                                <th className="px-4 py-3 text-center">Số Nhánh (EXT)</th>
                                <th className="px-4 py-3 text-left">Nhóm Quyền</th>
                                <th className="px-4 py-3 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-16 text-center text-slate-500 bg-slate-50/30">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-10 h-10 text-slate-300 mb-2.5" strokeWidth={1.5} />
                                            <h3 className="text-sm font-bold text-slate-700">Không tìm thấy nhân sự phù hợp</h3>
                                            <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bấm nút "Thêm Nhân Sự Mới".</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user: any) => (
                                <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <AvatarImage 
                                                src={user.avatar?.startsWith('http') ? user.avatar : user.avatar ? `/${user.avatar.replace(/^\//, '')}` : null} 
                                                name={user.name || user.email} 
                                                size={36} 
                                                className="border border-slate-200 shrink-0"
                                            />
                                            <div>
                                                <button onClick={() => openEditModal(user)} className="font-bold text-slate-900 hover:text-emerald-700 transition-colors text-left cursor-pointer">
                                                    {user.name || '---'}
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-600 font-mono text-xs">{user.email}</td>
                                    <td className="px-4 py-3 text-center">
                                        {user.extension ? (
                                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                                {user.extension}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                                            user.role === 'ADMIN' 
                                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                                : 'bg-slate-100 text-slate-700 border-slate-200'
                                        }`}>
                                            {user.permissionGroup?.name || user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button 
                                                onClick={() => openEditModal(user)} 
                                                aria-label="Sửa" 
                                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all cursor-pointer"
                                            >
                                                <Edit2 size={13} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(user.id, user.email)} 
                                                aria-label="Xóa" 
                                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Modal Thêm Mới */}
            {isAddModalOpen && (
                <UserModal title="Thêm nhân sự mới" isEdit={false} error={error}
                    formData={formData} setFormData={setFormData} permissionGroups={permissionGroups}
                    isLoading={isLoading} onSubmit={handleCreate} onClose={() => setIsAddModalOpen(false)} />
            )}

            {/* Modal Sửa */}
            {isEditModalOpen && (
                <UserModal title="Sửa thông tin" isEdit={true} error={error}
                    formData={formData} setFormData={setFormData} permissionGroups={permissionGroups}
                    isLoading={isLoading} onSubmit={handleUpdate} onClose={() => setIsEditModalOpen(false)} />
            )}
        </div>
    );
}

// Sub-Component UI tái sử dụng
function UserModal({ title, isEdit, error, formData, setFormData, isLoading, onSubmit, onClose, permissionGroups }: any) {
    return (
        <div className="modal-backdrop">
            <div className="modal-container" style={{ maxWidth: '42rem' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{title}</h3>
                </div>

                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: 'var(--surface)' }}>
                    {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                    <form id="user-form" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Input label="Họ và tên" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        <Input label="Email đăng nhập" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <Input label="Số nội bộ PBX (Ext)" placeholder="Vd: 101" value={formData.extension || ''} onChange={e => setFormData({ ...formData, extension: e.target.value })} />
                            <Input label="Mật khẩu WebRTC/SIP" placeholder="Vd: 123456" value={formData.sipPassword || ''} onChange={e => setFormData({ ...formData, sipPassword: e.target.value })} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Quyền truy cập</label>
                            <select
                                value={formData.role} onChange={e => {
                                    const newRole = e.target.value;
                                    setFormData({ ...formData, role: newRole });
                                }}
                                style={{ padding: '0.625rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', outline: 'none', background: 'var(--surface)', width: '100%', fontFamily: 'inherit' }}
                            >
                                <option value="USER">Người dùng bình thường (USER)</option>
                                <option value="ADMIN">Quản trị viên toàn hệ thống (ADMIN)</option>
                            </select>
                        </div>

                        {formData.role === 'USER' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Nhóm quyền (Vai trò)</label>
                                <select
                                    value={formData.permissionGroupId || ''}
                                    onChange={e => setFormData({ ...formData, permissionGroupId: e.target.value })}
                                    style={{ padding: '0.625rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', outline: 'none', background: 'var(--surface)', width: '100%', fontFamily: 'inherit' }}
                                    required={formData.role === 'USER'}
                                >
                                    <option value="" disabled>-- Chọn nhóm quyền --</option>
                                    {permissionGroups?.map((g: any) => (
                                        <option key={g.id} value={g.id}>{g.name} - {g.description}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)', marginTop: '0.5rem', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
                                <KeyRound size={16} /> Mật khẩu
                            </div>
                            {isEdit ? (
                                <Input placeholder="Bỏ trống nếu không muốn đổi mk" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} type="password" />
                            ) : (
                                <Input placeholder="Mặc định: 123456" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} type="password" />
                            )}
                        </div>
                    </form>
                </div>

                <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--background)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <Button type="button" variant="secondary" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Hủy</Button>
                    <Button type="submit" form="user-form" disabled={isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isLoading ? 'Đang lưu...' : 'Lưu lại'}</Button>
                </div>
            </div>
        </div>
    );
}
