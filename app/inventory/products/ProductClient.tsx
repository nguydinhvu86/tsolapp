'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Table } from '@/app/components/ui/Table';
import { Plus, Search, Edit, Trash2, Package, Layers } from 'lucide-react';
import { createProduct, updateProduct, deleteProduct, createProductGroup, updateProductGroup, deleteProductGroup } from '../actions';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

export default function ProductClient({ initialProducts, warehouses = [], productGroups = [] }: { initialProducts: any[], warehouses?: any[], productGroups?: any[] }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingProduct, setViewingProduct] = useState<any>(null);
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
    const [groupId, setGroupId] = useState('');

    // Group Management States
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [isSavingGroup, setIsSavingGroup] = useState(false);

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
        setGroupId(p.groupId || '');
        setIsModalOpen(true);
        setViewingProduct(null); // Close view modal if open
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
                description, notes, isActive: true,
                groupId: groupId || null
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

    // --- Group Management Handlers ---
    const openCreateGroupModal = () => {
        setEditingGroup(null);
        setGroupName('');
        setGroupDesc('');
        setIsGroupModalOpen(true);
    };

    const handleGroupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSavingGroup(true);
            const data = { name: groupName, description: groupDesc };
            if (editingGroup) {
                await updateProductGroup(editingGroup.id, data);
            } else {
                await createProductGroup(data);
            }
            // Reset form but keep modal open so they can see the list
            setEditingGroup(null);
            setGroupName('');
            setGroupDesc('');
            router.refresh();
        } catch (error: any) {
            alert(error.message || 'Có lỗi xảy ra!');
        } finally {
            setIsSavingGroup(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa nhóm này?')) {
            try {
                await deleteProductGroup(id);
                router.refresh();
            } catch (error: any) {
                alert(error.message || 'Không thể xóa nhóm này.');
            }
        }
    };

    const formatMoney = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

    const warehouseStockData = React.useMemo(() => {
        const stats: Record<string, number> = {};
        initialProducts.forEach(p => {
            if (p.type === 'PRODUCT' && p.inventories) {
                p.inventories.forEach((inv: any) => {
                    const wName = inv.warehouse?.name || 'Không rõ';
                    stats[wName] = (stats[wName] || 0) + inv.quantity;
                });
            }
        });
        return Object.entries(stats).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
    }, [initialProducts]);

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    return (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
            {warehouseStockData.length > 0 && (
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: '#fff' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Tỷ Trọng Tồn Kho Theo Kho</h3>
                    <div style={{ height: '220px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={warehouseStockData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {warehouseStockData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    formatter={(value: any) => [`${new Intl.NumberFormat('vi-VN').format(value)} đơn vị`, 'Số lượng Tồn']}
                                />
                                <Legend verticalAlign="middle" align="right" layout="vertical" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
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
                <Button variant="secondary" onClick={() => setIsGroupModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <Layers size={16} /> Quản lý Nhóm
                </Button>
                <Button onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                    <td>
                                        <button
                                            onClick={() => setViewingProduct(p)}
                                            style={{
                                                fontWeight: 600, color: 'var(--primary)',
                                                background: 'none', border: 'none', padding: 0,
                                                cursor: 'pointer', textAlign: 'left',
                                                textDecoration: 'underline'
                                            }}
                                            title="Nhấn để xem chi tiết"
                                        >
                                            {p.name}
                                        </button>
                                    </td>
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

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Tên Sản Phẩm / Dịch Vụ *</label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nhập tên mặt hàng..." />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Nhóm Sản Phẩm</label>
                                    <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                        <option value="">-- Không chọn nhóm --</option>
                                        {productGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
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

            {/* View Product Detail Modal */}
            {viewingProduct && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <Card style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                                    {viewingProduct.name}
                                </h2>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>SKU: {viewingProduct.sku}</span>
                            </div>
                            <Button
                                onClick={() => openEditModal(viewingProduct)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: 'white' }}
                            >
                                <Edit size={16} /> Chỉnh sửa
                            </Button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Thông Tin Chung</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Loại:</span>
                                    <span style={{ fontWeight: 500 }}>{viewingProduct.type === 'PRODUCT' ? 'Sản phẩm' : 'Dịch vụ'}</span>

                                    <span style={{ color: 'var(--text-muted)' }}>Nhóm:</span>
                                    <span style={{ fontWeight: 500 }}>{viewingProduct.group?.name || '-'}</span>

                                    <span style={{ color: 'var(--text-muted)' }}>Đơn vị tính:</span>
                                    <span style={{ fontWeight: 500 }}>{viewingProduct.unit || 'Cái'}</span>

                                    <span style={{ color: 'var(--text-muted)' }}>Thuế GTGT:</span>
                                    <span style={{ fontWeight: 500 }}>{viewingProduct.taxRate}%</span>

                                    <span style={{ color: 'var(--text-muted)' }}>Mức tồn tối thiểu:</span>
                                    <span style={{ fontWeight: 500, color: 'var(--danger)' }}>{viewingProduct.minStockLevel || 0}</span>
                                </div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Giá Cả</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Giá nhập:</span>
                                    <span style={{ fontWeight: 500 }}>{formatMoney(viewingProduct.importPrice)}</span>

                                    <span style={{ color: 'var(--text-muted)' }}>Giá bán:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatMoney(viewingProduct.salePrice)}</span>
                                </div>
                            </div>
                        </div>

                        {viewingProduct.type === 'PRODUCT' && viewingProduct.inventories && viewingProduct.inventories.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>Tồn Kho Thực Tế ({viewingProduct.inventories.reduce((acc: number, inv: any) => acc + inv.quantity, 0)} {viewingProduct.unit})</h3>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                        <thead style={{ background: '#f1f5f9' }}>
                                            <tr>
                                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Kho</th>
                                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Số Lượng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewingProduct.inventories.map((inv: any) => (
                                                <tr key={inv.id} style={{ borderTop: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '0.75rem 1rem' }}>{inv.warehouse.name}</td>
                                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>{inv.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Mô tả</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{viewingProduct.description || 'Không có mô tả.'}</p>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Ghi chú nội bộ</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{viewingProduct.notes || 'Không có ghi chú.'}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <Button type="button" variant="secondary" onClick={() => setViewingProduct(null)}>Đóng</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Manage Groups Modal */}
            {isGroupModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <Card style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                            Quản lý Nhóm Sản Phẩm
                        </h2>

                        <div style={{ display: 'flex', gap: '1.5rem', flexDirection: 'column' }}>
                            {/* Group List */}
                            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Tên Nhóm</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Mô tả</th>
                                            <th style={{ padding: '0.75rem 1rem', width: '80px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productGroups.map(g => (
                                            <tr key={g.id} style={{ borderTop: '1px solid var(--border)' }}>
                                                <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{g.name}</td>
                                                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{g.description || '-'}</td>
                                                <td style={{ padding: '0.75rem 1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => {
                                                            setEditingGroup(g);
                                                            setGroupName(g.name);
                                                            setGroupDesc(g.description || '');
                                                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Edit size={16} /></button>
                                                        <button onClick={() => handleDeleteGroup(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {productGroups.length === 0 && (
                                            <tr>
                                                <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Chưa có nhóm nào.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Group Form */}
                            <form onSubmit={handleGroupSubmit} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                                    {editingGroup ? 'Sửa Nhóm' : 'Thêm Nhóm Mới'}
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Tên Nhóm *</label>
                                        <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} required placeholder="VD: Đồ điện tử..." />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Mô tả</label>
                                        <Input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="Mô tả nhóm..." />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {editingGroup && (
                                            <Button type="button" variant="secondary" onClick={() => { setEditingGroup(null); setGroupName(''); setGroupDesc(''); }}>Hủy Sửa</Button>
                                        )}
                                        <Button type="submit" disabled={isSavingGroup} style={{ flex: 1 }}>
                                            {isSavingGroup ? 'Đang Lưu...' : (editingGroup ? 'Cập Nhật' : 'Thêm Mới')}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                            <Button type="button" variant="secondary" onClick={() => setIsGroupModalOpen(false)}>Đóng</Button>
                        </div>
                    </Card>
                </div>
            )}
        </Card>
    );
}
