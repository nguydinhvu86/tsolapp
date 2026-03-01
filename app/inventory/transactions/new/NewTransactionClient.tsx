'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createTransaction } from '../../transaction-actions';
import { useSession } from 'next-auth/react';

export default function NewTransactionClient({ products, warehouses }: { products: any[], warehouses: any[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const userId = session?.user?.id;

    const [isSaving, setIsSaving] = useState(false);

    // Form fields
    const [code, setCode] = useState(`TXN-${Date.now().toString().slice(-6)}`);
    const [type, setType] = useState('IN');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
    const [notes, setNotes] = useState('');
    const [fromWarehouseId, setFromWarehouseId] = useState('');
    const [toWarehouseId, setToWarehouseId] = useState('');

    // Line items
    const [items, setItems] = useState([{ productId: '', quantity: 1 }]);

    const handleAddItem = () => {
        setItems([...items, { productId: '', quantity: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const newItems: any = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            alert("Phiên đăng nhập đã hết hạn.");
            return;
        }

        try {
            setIsSaving(true);

            // Validate
            if (type === 'OUT' && !fromWarehouseId) throw new Error("Vui lòng chọn Kho xuất.");
            if (type === 'IN' && !toWarehouseId) throw new Error("Vui lòng chọn Kho nhập.");
            if (type === 'TRANSFER' && (!fromWarehouseId || !toWarehouseId)) throw new Error("Vui lòng chọn đầy đủ Kho xuất và Kho nhập.");
            if (items.some(i => !i.productId || i.quantity <= 0)) throw new Error("Vui lòng điền đầy đủ thông tin sản phẩm và số lượng > 0.");

            await createTransaction({
                code,
                type,
                notes,
                date: new Date(date),
                fromWarehouseId: type === 'OUT' || type === 'TRANSFER' ? fromWarehouseId : undefined,
                toWarehouseId: type === 'IN' || type === 'TRANSFER' ? toWarehouseId : undefined,
                creatorId: userId,
                items: items.map(i => ({ productId: i.productId, quantity: Number(i.quantity) }))
            });

            router.push('/inventory/transactions');
        } catch (error: any) {
            alert(error.message || 'Có lỗi xảy ra!');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <Button type="button" variant="secondary" onClick={() => router.push('/inventory/transactions')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> Quay lại
                </Button>
                <Button type="submit" disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <Save size={16} /> {isSaving ? 'Đang tạo...' : 'Tạo Phiếu Kho'}
                </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
                <Card style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Danh Sách Sản Phẩm</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {items.map((item, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 150px auto', gap: '1rem', alignItems: 'end', paddingBottom: '1rem', borderBottom: '1px dashed var(--border)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Sản phẩm *</label>
                                    <select
                                        required
                                        value={item.productId}
                                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }}
                                    >
                                        <option value="">-- Chọn sản phẩm --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Số lượng *</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        required
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    />
                                </div>
                                <Button type="button" variant="secondary" onClick={() => handleRemoveItem(index)} disabled={items.length === 1} style={{ padding: '0.625rem', color: 'var(--danger)' }}>
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        ))}

                        <Button type="button" variant="secondary" onClick={handleAddItem} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}>
                            <Plus size={16} /> Thêm sản phẩm
                        </Button>
                    </div>
                </Card>

                <Card style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Thông Tin Phiếu</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Mã phiếu *</label>
                            <Input value={code} onChange={(e) => setCode(e.target.value)} required />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Loại giao dịch *</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }}
                            >
                                <option value="IN">Nhập Kho (IN)</option>
                                <option value="OUT">Xuất Kho (OUT)</option>
                                <option value="TRANSFER">Chuyển Kho (TRANSFER)</option>
                            </select>
                        </div>

                        {(type === 'OUT' || type === 'TRANSFER') && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Từ Kho (Xuất) *</label>
                                <select
                                    required
                                    value={fromWarehouseId}
                                    onChange={(e) => setFromWarehouseId(e.target.value)}
                                    style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }}
                                >
                                    <option value="">-- Chọn Kho Khởi Hành --</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(type === 'IN' || type === 'TRANSFER') && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Đến Kho (Nhập) *</label>
                                <select
                                    required
                                    value={toWarehouseId}
                                    onChange={(e) => setToWarehouseId(e.target.value)}
                                    style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }}
                                >
                                    <option value="">-- Chọn Kho Đính Đến --</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Ngày chứng từ</label>
                            <input
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Ghi chú</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                                placeholder="Ghi chú thêm..."
                            />
                        </div>
                    </div>
                </Card>
            </div>
        </form>
    );
}
