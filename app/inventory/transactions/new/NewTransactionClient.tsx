'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createTransaction } from '../../transaction-actions';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/app/i18n/LanguageContext';

export default function NewTransactionClient({ products, warehouses }: { products: any[], warehouses: any[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const { t } = useTranslation();

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
            alert(t('transactions.sessionExpired'));
            return;
        }

        try {
            setIsSaving(true);

            // Validate
            if (type === 'OUT' && !fromWarehouseId) throw new Error(t('transactions.errorNoFromWarehouse'));
            if (type === 'IN' && !toWarehouseId) throw new Error(t('transactions.errorNoToWarehouse'));
            if (type === 'TRANSFER' && (!fromWarehouseId || !toWarehouseId)) throw new Error(t('transactions.errorNoBothWarehouses'));
            if (items.some(i => !i.productId || i.quantity <= 0)) throw new Error(t('transactions.errorInvalidItem'));

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
            alert(error.message || t('transactions.genericError'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <Button type="button" variant="secondary" onClick={() => router.push('/inventory/transactions')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> {t('transactions.btnBack')}
                </Button>
                <Button type="submit" disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <Save size={16} /> {isSaving ? t('transactions.btnCreating') : t('transactions.btnCreate')}
                </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
                <Card style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>{t('transactions.productListTitle')}</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {items.map((item, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 150px auto', gap: '1rem', alignItems: 'end', paddingBottom: '1rem', borderBottom: '1px dashed var(--border)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('transactions.formProductLabel')}</label>
                                    <select
                                        required
                                        value={item.productId}
                                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }}
                                    >
                                        <option value="">{t('transactions.formProductPlaceholder')}</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('transactions.formQuantityLabel')}</label>
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
                            <Plus size={16} /> {t('transactions.formAddProductBtn')}
                        </Button>
                    </div>
                </Card>

                <Card style={{ padding: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>{t('transactions.formDetailsTitle')}</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('transactions.formCodeLabel')}</label>
                            <Input value={code} onChange={(e) => setCode(e.target.value)} required />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('transactions.formTypeLabel')}</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }}
                            >
                                <option value="IN">{t('transactions.formTypeIn')}</option>
                                <option value="OUT">{t('transactions.formTypeOut')}</option>
                                <option value="TRANSFER">{t('transactions.formTypeTransfer')}</option>
                            </select>
                        </div>

                        {(type === 'OUT' || type === 'TRANSFER') && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('transactions.formFromWarehouseLabel')}</label>
                                <select
                                    required
                                    value={fromWarehouseId}
                                    onChange={(e) => setFromWarehouseId(e.target.value)}
                                    style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }}
                                >
                                    <option value="">{t('transactions.formFromWarehousePlaceholder')}</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(type === 'IN' || type === 'TRANSFER') && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('transactions.formToWarehouseLabel')}</label>
                                <select
                                    required
                                    value={toWarehouseId}
                                    onChange={(e) => setToWarehouseId(e.target.value)}
                                    style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }}
                                >
                                    <option value="">{t('transactions.formToWarehousePlaceholder')}</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('transactions.formDateLabel')}</label>
                            <input
                                type="datetime-local"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none', fontFamily: 'inherit' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('transactions.formNotesLabel')}</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                                placeholder={t('transactions.formNotesPlaceholder')}
                            />
                        </div>
                    </div>
                </Card>
            </div>
        </form>
    );
}
