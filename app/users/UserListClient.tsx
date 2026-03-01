'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Plus, Edit2, Trash2, KeyRound } from 'lucide-react';
import { createUser, updateUser, deleteUser } from './actions';
import { useRouter } from 'next/navigation';
import { RESOURCES, ACTIONS, PermissionHelper } from '@/lib/permissions';

export function UserListClient({ initialUsers }: { initialUsers: any[] }) {
    const router = useRouter();
    const [users, setUsers] = useState(initialUsers);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', email: '', role: 'USER', password: '', permissions: [] as string[] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const openAddModal = () => {
        setFormData({ name: '', email: '', role: 'USER', password: '', permissions: [] });
        setError('');
        setIsAddModalOpen(true);
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setFormData({ name: user.name || '', email: user.email, role: user.role, password: '', permissions: user.permissions || [] });
        setError('');
        setIsEditModalOpen(true);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await createUser(formData);
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
            await updateUser(editingUser.id, formData);
            setIsEditModalOpen(false);
            router.refresh(); // Tải lại danh sách từ server (hoặc update state nội bộ, ở đây ưu tiên reload để chắc ăn)
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
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Danh sách người dùng</h2>
                <Button onClick={openAddModal} className="gap-2">
                    <Plus size={18} /> Thêm nhân sự
                </Button>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Tên</th>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Email</th>
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
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600,
                                        background: user.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                        color: user.role === 'ADMIN' ? '#4f46e5' : '#475569'
                                    }}>
                                        {user.role}
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

            {/* Modal Thêm Mới */}
            {isAddModalOpen && (
                <UserModal title="Thêm nhân sự mới" isEdit={false} error={error}
                    formData={formData} setFormData={setFormData}
                    isLoading={isLoading} onSubmit={handleCreate} onClose={() => setIsAddModalOpen(false)} />
            )}

            {/* Modal Sửa */}
            {isEditModalOpen && (
                <UserModal title="Sửa thông tin" isEdit={true} error={error}
                    formData={formData} setFormData={setFormData}
                    isLoading={isLoading} onSubmit={handleUpdate} onClose={() => setIsEditModalOpen(false)} />
            )}
        </Card>
    );
}

// Sub-Component UI tái sử dụng
function UserModal({ title, isEdit, error, formData, setFormData, isLoading, onSubmit, onClose }: any) {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <Card style={{ width: '100%', maxWidth: '500px', animation: 'fadeIn 0.2s ease-out' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>{title}</h3>
                {error && <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                    <Input label="Họ và tên" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    <Input label="Email đăng nhập" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />

                    <div className="flex flex-col gap-1">
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Quyền hạn</label>
                        <select
                            value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                            style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', background: 'white' }}
                        >
                            <option value="USER">Nhân viên (USER)</option>
                            <option value="ADMIN">Quản trị viên (ADMIN)</option>
                        </select>
                    </div>

                    {formData.role === 'USER' && (
                        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Phân quyền chi tiết (Ma trận)</div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions.includes(PermissionHelper.VIEW_DASHBOARD)}
                                        onChange={(e) => {
                                            if (e.target.checked) setFormData({ ...formData, permissions: [...formData.permissions, PermissionHelper.VIEW_DASHBOARD] });
                                            else setFormData({ ...formData, permissions: formData.permissions.filter((p: string) => p !== PermissionHelper.VIEW_DASHBOARD) });
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <strong>Truy cập Bảng điều khiển (Dashboard)</strong>
                                </label>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>Chức năng</th>
                                        {ACTIONS.map(action => (
                                            <th key={action.id} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'center' }}>
                                                {action.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {RESOURCES.map(res => (
                                        <tr key={res.id}>
                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{res.name}</td>
                                            {ACTIONS.map(action => {
                                                const permCode = PermissionHelper.generateCode(res.id, action.id);
                                                const isChecked = formData.permissions.includes(permCode);
                                                return (
                                                    <td key={action.id} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
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
                                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                        />
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
                            <KeyRound size={16} /> Mật khẩu
                        </div>
                        {isEdit ? (
                            <Input placeholder="Bỏ trống nếu không muốn đổi mk" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} type="password" />
                        ) : (
                            <Input placeholder="Mặc định: 123456" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} type="password" />
                        )}
                    </div>

                    <div className="flex justify-end gap-3" style={{ marginTop: '1rem' }}>
                        <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                        <Button type="submit" disabled={isLoading}>{isLoading ? 'Đang lưu...' : 'Lưu lại'}</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
