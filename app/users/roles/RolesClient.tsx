'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { createPermissionGroup, updatePermissionGroup, deletePermissionGroup } from '../actions';
import { useRouter } from 'next/navigation';
import { RESOURCES, ACTIONS, PermissionHelper } from '@/lib/permissions';

export function RolesClient({ initialGroups }: { initialGroups: any[] }) {
    const router = useRouter();
    const [groups, setGroups] = useState(initialGroups);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', description: '', permissions: [] as string[] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
        if (confirm(`Bạn có chắc muốn xóa nhóm quyền "${name}"? Thao tác này có thể gỡ role của các tài khoản đang thuộc nhóm.`)) {
            try {
                await deletePermissionGroup(id);
                setGroups(prev => prev.filter(g => g.id !== id));
            } catch (err: any) {
                alert(err.message || 'Lỗi khi xóa nhóm quyền');
            }
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Danh sách nhóm quyền (Roles)</h2>
                <Button onClick={openAddModal} className="gap-2">
                    <Plus size={18} /> Tạo nhóm mới
                </Button>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Tên nhóm</th>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Mô tả</th>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>Loại</th>
                            <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map((group: any) => (
                            <tr key={group.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>
                                    <button onClick={() => openEditModal(group)} className="text-blue-600 hover:underline bg-transparent border-none p-0 cursor-pointer text-left font-medium">
                                        {group.name}
                                    </button>
                                </td>
                                <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{group.description || '---'}</td>
                                <td style={{ padding: '1rem' }}>
                                    {group.isSystem ? (
                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#e0e7ff', color: '#4338ca', borderRadius: '4px', fontWeight: 600 }}>Mặc định</span>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontWeight: 600 }}>Tùy chỉnh</span>
                                    )}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => openEditModal(group)} aria-label="Sửa" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>
                                            <Edit2 size={16} />
                                        </button>
                                        {!group.isSystem && (
                                            <button onClick={() => handleDelete(group.id, group.name)} aria-label="Xóa" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Thêm Mới */}
            {isAddModalOpen && (
                <RoleModal title="Thêm nhóm quyền" isSystem={false} error={error}
                    formData={formData} setFormData={setFormData}
                    isLoading={isLoading} onSubmit={handleCreate} onClose={() => setIsAddModalOpen(false)} />
            )}

            {/* Modal Sửa */}
            {isEditModalOpen && (
                <RoleModal title={editingGroup?.isSystem ? 'Sửa quyền cho nhóm mặc định' : 'Sửa nhóm quyền'} isSystem={editingGroup?.isSystem} error={error}
                    formData={formData} setFormData={setFormData}
                    isLoading={isLoading} onSubmit={handleUpdate} onClose={() => setIsEditModalOpen(false)} />
            )}
        </Card>
    );
}

function RoleModal({ title, isSystem, error, formData, setFormData, isLoading, onSubmit, onClose }: any) {
    return (
        <div style={{ position: 'fixed', inset: 0, padding: '1rem', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <Card style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease-out', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'white' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{title}</h3>
                </div>

                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    {error && <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

                    <form id="role-form" onSubmit={onSubmit} className="flex flex-col gap-4">
                        <Input label="Tên nhóm quyền" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required disabled={isSystem} />
                        <Input label="Mô tả tham khảo" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />

                        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-main)' }}>Thiết lập phân quyền (Ma trận)</div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
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
                                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions.includes(PermissionHelper.USE_SOFTPHONE)}
                                        onChange={(e) => {
                                            if (e.target.checked) setFormData({ ...formData, permissions: [...formData.permissions, PermissionHelper.USE_SOFTPHONE] });
                                            else setFormData({ ...formData, permissions: formData.permissions.filter((p: string) => p !== PermissionHelper.USE_SOFTPHONE) });
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <strong>Sử dụng Tổng Đài WebRTC (Softphone)</strong>
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
                    </form>
                </div>

                <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'white', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit" form="role-form" disabled={isLoading}>{isLoading ? 'Đang lưu...' : 'Lưu lại'}</Button>
                </div>
            </Card>
        </div>
    );
}
