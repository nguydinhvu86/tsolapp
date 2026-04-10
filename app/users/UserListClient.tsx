'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Plus, Edit2, Trash2, KeyRound } from 'lucide-react';
import { createUser, updateUser, deleteUser } from './actions';
import { useRouter } from 'next/navigation';
import { RESOURCES, ACTIONS, PermissionHelper } from '@/lib/permissions';

export function UserListClient({ initialUsers, permissionGroups = [] }: { initialUsers: any[], permissionGroups?: any[] }) {
    const router = useRouter();
    const [users, setUsers] = useState(initialUsers);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', email: '', role: 'USER', password: '', permissionGroupId: '', permissions: [] as string[], extension: '', sipPassword: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
            // Local state update for immediate UI feedback without F5
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
            // Local state update for immediate UI feedback without F5
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
                // xoá ở UI
                setUsers(prev => prev.filter(u => u.id !== id));
            } catch (err: any) {
                alert(err.message || 'Có lỗi xảy ra khi xóa');
            }
        }
    };

    return (
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Danh sách người dùng</h2>
                <Button onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Thêm nhân sự
                </Button>
            </div>

            {/* Desktop View */}
            <div className="hide-on-mobile table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Tên</th>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Email</th>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Số máy nhánh (EXT)</th>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Quyền hạn</th>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user: any) => (
                            <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>
                                    <button onClick={() => openEditModal(user)} className="text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer text-left font-medium">
                                        {user.name || '---'}
                                    </button>
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{user.email}</td>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                                    <span style={{fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, display: 'inline-block'}}>{user.extension || '---'}</span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600,
                                        background: user.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                        color: user.role === 'ADMIN' ? '#4f46e5' : '#475569',
                                        display: 'inline-block', whiteSpace: 'nowrap'
                                    }}>
                                        {user.permissionGroup?.name || user.role}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => openEditModal(user)} aria-label="Sửa" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(user.id, user.email)} aria-label="Xóa" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Chưa có người dùng nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="show-on-mobile mobile-card-list">
                {users.map((user: any) => (
                    <div key={user.id} className="mobile-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <button onClick={() => openEditModal(user)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: '1rem', color: 'var(--primary)', padding: 0 }}>
                                    {user.name || '---'}
                                </button>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{user.email}</div>
                            </div>
                            <span style={{
                                padding: '0.25rem 0.5rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 600,
                                background: user.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                color: user.role === 'ADMIN' ? '#4f46e5' : '#475569',
                                display: 'inline-block', whiteSpace: 'nowrap', flexShrink: 0
                            }}>
                                {user.permissionGroup?.name || user.role}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                            <button onClick={() => openEditModal(user)} aria-label="Sửa" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>
                                <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(user.id, user.email)} aria-label="Xóa" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
                {users.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        Chưa có người dùng nào.
                    </div>
                )}
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
        </Card>
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
