'use client'

import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Table } from '@/app/components/ui/Table';
import { Search, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getWarehouseStockForAdjustment } from '../report-actions';
import { createTransaction, processTransaction } from '../transaction-actions';
import { useSession } from 'next-auth/react';

export default function AdjustmentClient({ warehouses }: { warehouses: any[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const userId = session?.user?.id;

    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // items is a map of productId -> { product: object, systemQty: number, actualQty: string }
    const [items, setItems] = useState<Record<string, any>>({});

    // Notes for the adjustment transaction
    const [notes, setNotes] = useState('Kiểm kê định kỳ');

    // Load stock when warehouse changes
    useEffect(() => {
        const loadStock = async () => {
            if (!selectedWarehouse) {
                setItems({});
                return;
            }
            try {
                setIsLoading(true);
                const data = await getWarehouseStockForAdjustment(selectedWarehouse);
                const newItems: Record<string, any> = {};
                data.forEach((inv: any) => {
                    newItems[inv.productId] = {
                        product: inv.product,
                        systemQty: inv.quantity,
                        actualQty: inv.quantity.toString() // default to system qty
                    };
                });
                setItems(newItems);
            } catch (error) {
                console.error("Error loading stock", error);
                alert("Lỗi tải tồn kho");
            } finally {
                setIsLoading(false);
            }
        };

        loadStock();
    }, [selectedWarehouse]);

    const handleActualChange = (productId: string, value: string) => {
        setItems(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                actualQty: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            alert("Phiên đăng nhập đã hết hạn.");
            return;
        }
        if (!selectedWarehouse) {
            alert("Vui lòng chọn Kho để kiểm kê.");
            return;
        }

        // Calculate differences
        const differences: { productId: string, quantity: number }[] = [];

        Object.values(items).forEach(item => {
            // we only process if there's a difference
            const actual = parseInt(item.actualQty);
            if (!isNaN(actual) && actual !== item.systemQty) {
                // For an ADJUSTMENT transaction, the quantity is the raw difference
                // e.g. system=10, actual=12 => qty = +2
                // system=10, actual=8 => qty = -2
                differences.push({
                    productId: item.product.id,
                    quantity: actual - item.systemQty
                });
            }
        });

        if (differences.length === 0) {
            alert("Không có chênh lệch nào so với hệ thống. Không cần tạo phiếu điều chỉnh.");
            return;
        }

        if (confirm(`Phát hiện ${differences.length} mặt hàng có chênh lệch. Bạn có chắc muốn tạo & duyệt Phiếu Điều Chỉnh? Hao hụt/Dư thừa sẽ được cộng/trừ trực tiếp vào tồn kho.`)) {
            try {
                setIsSaving(true);

                // 1. Create DRAFT transaction
                const code = `ADJ-${Date.now().toString().slice(-6)}`;
                const newTx = await createTransaction({
                    code,
                    type: 'ADJUSTMENT',
                    notes: `Phiếu kiểm kê: ${notes}`,
                    date: new Date(),
                    fromWarehouseId: selectedWarehouse, // For adjustments, we just use fromWarehouse as the target
                    creatorId: userId,
                    items: differences
                });

                // 2. Automatically Process it so the inventory is actually adjusted
                await processTransaction(newTx.id, userId);

                alert(`Đã kiểm kê xong! Phiếu ${code} đã được duyệt & cập nhật.`);
                router.push(`/inventory/transactions/${newTx.id}`);

            } catch (error: any) {
                alert(error.message || 'Có lỗi xảy ra!');
            } finally {
                setIsSaving(false);
            }
        }
    };

    // Filter displayed items
    const displayItems = Object.values(items).filter(item =>
        item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Chọn Kho Cần Kiểm Kê *</label>
                        <select
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                            style={{
                                width: '100%', padding: '0.625rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                outline: 'none', fontSize: '0.875rem', backgroundColor: 'white'
                            }}
                        >
                            <option value="">-- Chọn Kho Khởi Hành --</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ flex: 1, minWidth: '350px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Mục Đích / Ghi Chú</label>
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ghi chú đợt kiểm kê..."
                        />
                    </div>
                </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
                {!selectedWarehouse ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                        Vui lòng chọn một kho để bắt đầu kiểm đếm.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                placeholder="Tìm mặt hàng để nhập số..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem',
                                    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                    outline: 'none', transition: 'border-color 0.2s', fontSize: '0.875rem'
                                }}
                            />
                        </div>

                        {isLoading ? (
                            <p>Đang tải dữ liệu tồn hệ thống...</p>
                        ) : (
                            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>Mã SKU</th>
                                            <th>Tên Sản Phẩm</th>
                                            <th style={{ textAlign: 'center' }}>ĐVT</th>
                                            <th style={{ textAlign: 'right', width: '150px' }}>Tồn Hệ Thống</th>
                                            <th style={{ textAlign: 'right', width: '200px' }}>THỰC TẾ KIỂM ĐẾM</th>
                                            <th style={{ textAlign: 'right', width: '150px' }}>Chênh Lệch</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayItems.length > 0 ? displayItems.map(item => {
                                            const actual = parseInt(item.actualQty);
                                            const diff = isNaN(actual) ? 0 : actual - item.systemQty;

                                            // highlight diffs
                                            let diffColor = 'var(--text-muted)';
                                            let bgRow = 'transparent';
                                            if (diff > 0) {
                                                diffColor = '#16a34a'; // green
                                                bgRow = 'rgba(22, 163, 74, 0.05)';
                                            } else if (diff < 0) {
                                                diffColor = '#ef4444'; // red
                                                bgRow = 'rgba(239, 68, 68, 0.05)';
                                            }

                                            return (
                                                <tr key={item.product.id} style={{ backgroundColor: bgRow, transition: 'background-color 0.2s' }}>
                                                    <td style={{ fontWeight: 600 }}>{item.product.sku}</td>
                                                    <td>{item.product.name}</td>
                                                    <td style={{ textAlign: 'center' }}>{item.product.unit}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: '1.05em' }}>{item.systemQty}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={item.actualQty}
                                                            onChange={(e) => handleActualChange(item.product.id, e.target.value)}
                                                            style={{ textAlign: 'right', fontWeight: 800, borderColor: diff !== 0 ? 'var(--primary)' : 'var(--border)' }}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 800, color: diffColor }}>
                                                        {diff > 0 ? `+${diff}` : diff}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                                    Không tìm thấy mặt hàng nào phù hợp hoặc kho chưa có hàng.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <Button type="submit" disabled={isSaving || isLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#16a34a', color: 'white' }}>
                                <Save size={16} /> {isSaving ? 'Đang Xử Lý...' : 'Hoàn Tất Kiểm Kê (Tạo & Duyệt Điều Chỉnh)'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Card>
    );
}
