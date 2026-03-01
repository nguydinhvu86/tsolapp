'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Table } from '@/app/components/ui/Table';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { createProduct, updateProduct, deleteProduct } from '../actions';
import { useRouter } from 'next/navigation';

export default function ProductClient({ initialProducts, warehouses = [] }: { initialProducts: any[], warehouses?: any[] }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [sku, setSku] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
    const [unit, setUnit] = useState('Cái');
    const [taxRate, setTaxRate] = useState('0');
    const [importPrice, setImportPrice] = useState('0');
    const [salePrice, setSalePrice] = useState('0');
    const [minStockLevel, setMinStockLevel] = useState('10');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');

    const filtered = initialProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openCreateModal = () => {
        setEditingProduct(null);
        setSku('');
        setName('');
        setType('PRODUCT');
        setUnit('Cái');
        setTaxRate('0');
        setImportPrice('0');
        setSalePrice('0');
        setMinStockLevel('10');
        setDescription('');
        setNotes('');
        setIsModalOpen(true);
    };

    const openEditModal = (p: any) => {
        setEditingProduct(p);
        setSku(p.sku);
        setName(p.name);
        setType(p.type);
        setUnit(p.unit || 'Cái');
        setTaxRate((p.taxRate || 0).toString());
        setImportPrice(p.importPrice.toString());
        setSalePrice(p.salePrice.toString());
        setMinStockLevel(p.minStockLevel.toString());
        setDescription(p.description || '');
        setNotes(p.notes || '');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const data = {
                sku, name, type,
                unit,
                taxRate: parseFloat(taxRate),
                importPrice: parseFloat(importPrice),
                salePrice: parseFloat(salePrice),
                minStockLevel: parseInt(minStockLevel),
                description, notes, isActive: true
            };

            if (editingProduct) {
                await updateProduct(editingProduct.id, data);
            } else {
                await createProduct(data);
            }
            setIsModalOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Có lỗi xảy ra!');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa mặt hàng này? Hàng hóa đã phát sinh giao dịch không nên xóa, hãy tạm ngưng!')) {
            try {
                await deleteProduct(id);
                router.refresh();
            } catch (error) {
                alert('Không thể xóa! Có thể do mặt hàng đã có trong phiều xuất nhập kho.');
            }
        }
    };

    const formatMoney = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

    return (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Tìm theo tên hoặc mã SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                            outline: 'none', transition: 'border-color 0.2s', fontSize: '0.875rem'
                        }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <select
                        value={selectedWarehouseId}
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        style={{
                            width: '100%', padding: '0.625rem 1rem',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                            outline: 'none', transition: 'border-color 0.2s', fontSize: '0.875rem',
                            backgroundColor: 'white'
                        }}
                    >
                        <option value="">Tất cả kho (Tổng Tồn)</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
                <Button onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <Plus size={16} /> Thêm Sản Phẩm / Dịch Vụ
                </Button>
            </div>

            <div style={{ padding: '0' }}>
                <Table>
                    <thead>
                        <tr>
                            <th>Loại</th>
                            <th>Mã SKU</th>
                            <th>Tên Sản Phẩm / Dịch Vụ</th>
                            <th style={{ textAlign: 'center' }}>ĐVT</th>
                            <th style={{ textAlign: 'right' }}>Giá Bán</th>
                            <th style={{ textAlign: 'center' }}>Thuế (%)</th>
                            <th style={{ textAlign: 'center' }}>{selectedWarehouseId ? 'Tồn (Theo kho)' : 'Tồn Tổng'}</th>
                            <th style={{ width: '100px', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((p) => {
                            let displayedStock = 0;
                            if (selectedWarehouseId) {
                                const currentInv = p.inventories?.find((i: any) => i.warehouseId === selectedWarehouseId);
                                displayedStock = currentInv ? currentInv.quantity : 0;
                            } else {
                                displayedStock = p.inventories?.reduce((acc: number, inv: any) => acc + inv.quantity, 0) || 0;
                            }

                            const isLowStock = p.type === 'PRODUCT' && !selectedWarehouseId && displayedStock <= p.minStockLevel;

                            return (
                                <tr key={p.id}>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                            backgroundColor: p.type === 'PRODUCT' ? '#dbeafe' : '#fef3c7',
                                            color: p.type === 'PRODUCT' ? '#1e40af' : '#b45309'
                                        }}>
                                            {p.type === 'PRODUCT' ? 'SẢN PHẨM' : 'DỊCH VỤ'}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{p.sku}</td>
                                    <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{p.name}</td>
                                    <td style={{ textAlign: 'center' }}>{p.unit || 'Cái'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{formatMoney(p.salePrice)}</td>
                                    <td style={{ textAlign: 'center' }}>{p.taxRate}%</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {p.type === 'PRODUCT' ? (
                                            <span style={{
                                                padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 700,
                                                backgroundColor: isLowStock ? '#fee2e2' : '#dcfce7',
                                                color: isLowStock ? '#ef4444' : '#16a34a'
                                            }}>
                                                {displayedStock}
                                            </span>
                                        ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => openEditModal(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                    Không tìm thấy sản phẩm/dịch vụ nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <Card style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                            {editingProduct ? 'Chỉnh Sửa Mặt Hàng' : 'Thêm Mới Mặt Hàng'}
                        </h2>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Loại Mặt Hàng *</label>
                                    <select value={type} onChange={(e) => setType(e.target.value as any)}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                        <option value="PRODUCT">Sản phẩm (Quản lý tồn kho)</option>
                                        <option value="SERVICE">Dịch vụ (Không tồn kho)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Mã SKU *</label>
                                    <Input value={sku} onChange={(e) => setSku(e.target.value)} required placeholder="VD: SP001" />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Tên Sản Phẩm / Dịch Vụ *</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nhập tên mặt hàng..." />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Đơn Vị Tính</label>
                                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="VD: Cái, Hộp, Bộ..." required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Tỷ Lệ Thuế GTGT (%)</label>
                                    <select value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="8">8%</option>
                                        <option value="10">10%</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Giá Nhập (VNĐ)</label>
                                    <Input type="number" value={importPrice} onChange={(e) => setImportPrice(e.target.value)} min="0" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Giá Bán (VNĐ) *</label>
                                    <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} min="0" required />
                                </div>
                            </div>

                            {type === 'PRODUCT' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Mức Tồn Tối Thiểu (Cảnh Báo) *</label>
                                    <Input type="number" value={minStockLevel} onChange={(e) => setMinStockLevel(e.target.value)} min="0" required />
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Hệ thống sẽ cảnh báo khi tổng tồn kho thấp hơn mức này.</p>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Mô Tả</label>
                                <textarea
                                    value={description} onChange={(e) => setDescription(e.target.value)}
                                    style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minHeight: '80px', outline: 'none', resize: 'vertical' }}
                                    placeholder="Đặc điểm, thông số kỹ thuật..."
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Ghi Chú Nội Bộ</label>
                                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú thêm..." />
                            </div>

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
