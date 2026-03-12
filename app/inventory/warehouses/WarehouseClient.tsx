'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Plus, Edit, Home } from 'lucide-react';
import { createWarehouse, updateWarehouse } from '../actions';
import { useRouter } from 'next/navigation';

export default function WarehouseClient({ initialWarehouses }: { initialWarehouses: any[] }) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const { paginatedItems, paginationProps } = usePagination(initialWarehouses, 25);

    const openCreateModal = () => {
        setEditingNode(null);
        setName('');
        setLocation('');
        setIsDefault(initialWarehouses.length === 0);
        setIsModalOpen(true);
    };

    const openEditModal = (w: any) => {
        setEditingNode(w);
        setName(w.name);
        setLocation(w.location || '');
        setIsDefault(w.isDefault);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const data = { name, location, isDefault };
            if (editingNode) {
                await updateWarehouse(editingNode.id, data);
            } else {
                await createWarehouse(data);
            }
            setIsModalOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Có lỗi xảy ra!');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' }}>
                <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>Tổng Số Kho: {initialWarehouses.length}</h3>
                <Button onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Thêm Kho Mới
                </Button>
            </div>

            <div style={{ padding: '0' }}>
                <Table>
                    <thead>
                        <tr>
                            <th>Tên Kho</th>
                            <th>Vị Trí / Địa Chỉ</th>
                            <th>Loại Kho</th>
                            <th style={{ width: '100px', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.length > 0 ? paginatedItems.map((w) => (
                            <tr key={w.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{w.name}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{w.location || '-'}</td>
                                <td>
                                    {w.isDefault ? (
                                        <span style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                            backgroundColor: '#dbeafe', color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                                        }}>
                                            <Home size={12} /> Kho Mặc Định
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Kho Phụ</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button onClick={() => openEditModal(w)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Edit size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                    Chưa có kho hàng nào được tạo.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
                <Pagination {...paginationProps} />
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <Card style={{ width: '100%', maxWidth: '500px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                            {editingNode ? 'Chỉnh Sửa Kho Hàng' : 'Tạo Kho Hàng Mới'}
                        </h2>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Tên Kho *</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="VD: Kho Tổng Hà Nội" />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Vị Trí / Địa Chỉ</label>
                                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Nhập địa lý kho..." />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    style={{ width: '1rem', height: '1rem' }}
                                />
                                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Đặt làm Kho Mặc Định</span>
                            </label>
                            {isDefault && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Hệ thống sẽ tự động chọn kho này cho các giao dịch mặc định.</p>}

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? 'Đang Lưu...' : 'Lưu Lại'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </Card>
    );
}
