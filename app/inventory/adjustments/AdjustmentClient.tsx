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
import { useTranslation } from '@/app/i18n/LanguageContext';

export default function AdjustmentClient({ warehouses }: { warehouses: any[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const { t } = useTranslation();

    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // items is a map of productId -> { product: object, systemQty: number, actualQty: string }
    const [items, setItems] = useState<Record<string, any>>({});

    // Notes for the adjustment transaction
    const [notes, setNotes] = useState(t('adjustments.defaultNotes'));

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
                alert(t('adjustments.errorLoadStock'));
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
            alert(t('transactions.sessionExpired'));
            return;
        }
        if (!selectedWarehouse) {
            alert(t('adjustments.errorNoWarehouse'));
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
            alert(t('adjustments.errorNoDifference'));
            return;
        }

        if (confirm(t('adjustments.confirmAdjustment').replace('{{count}}', differences.length.toString()))) {
            try {
                setIsSaving(true);

                // 1. Create DRAFT transaction
                const code = `ADJ-${Date.now().toString().slice(-6)}`;
                const newTx = await createTransaction({
                    code,
                    type: 'ADJUSTMENT',
                    notes: t('adjustments.txNotesPrefix').replace('{{notes}}', notes),
                    date: new Date(),
                    fromWarehouseId: selectedWarehouse, // For adjustments, we just use fromWarehouse as the target
                    creatorId: userId,
                    items: differences
                });

                // 2. Automatically Process it so the inventory is actually adjusted
                await processTransaction(newTx.id, userId);

                alert(t('adjustments.successMsg').replace('{{code}}', code));
                router.push(`/inventory/transactions/${newTx.id}`);

            } catch (error: any) {
                alert(error.message || t('transactions.genericError'));
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
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('adjustments.labelSelectWarehouse')}</label>
                        <select
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                            style={{
                                width: '100%', padding: '0.625rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                                outline: 'none', fontSize: '0.875rem', backgroundColor: 'white'
                            }}
                        >
                            <option value="">{t('adjustments.placeholderSelectWarehouse')}</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ flex: 1, minWidth: '350px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{t('adjustments.labelNotes')}</label>
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('adjustments.placeholderNotes')}
                        />
                    </div>
                </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
                {!selectedWarehouse ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                        {t('adjustments.msgSelectWarehouseFirst')}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                placeholder={t('adjustments.searchPlaceholder')}
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
                            <p>{t('adjustments.loadingStock')}</p>
                        ) : (
                            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>{t('transactions.colSku')}</th>
                                            <th>{t('transactions.colProductName')}</th>
                                            <th style={{ textAlign: 'center' }}>{t('transactions.colUnit')}</th>
                                            <th style={{ textAlign: 'right', width: '150px' }}>{t('adjustments.colSystemQty')}</th>
                                            <th style={{ textAlign: 'right', width: '200px' }}>{t('adjustments.colActualQty')}</th>
                                            <th style={{ textAlign: 'right', width: '150px' }}>{t('adjustments.colDiff')}</th>
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
                                                    {t('adjustments.noItems')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <Button type="submit" disabled={isSaving || isLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#16a34a', color: 'white' }}>
                                <Save size={16} /> {isSaving ? t('adjustments.btnProcessing') : t('adjustments.btnComplete')}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Card>
    );
}
