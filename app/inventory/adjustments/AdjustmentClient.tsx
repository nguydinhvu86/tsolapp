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
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-50"></span>
                        Kiểm Kê Kho & Điều Chỉnh
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Đối chiếu số lượng thực tế với tồn kho hệ thống và tạo phiếu điều chỉnh tự động
                    </p>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                {t('adjustments.labelSelectWarehouse')} <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={selectedWarehouse}
                                onChange={(e) => setSelectedWarehouse(e.target.value)}
                                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 font-medium"
                            >
                                <option value="">{t('adjustments.placeholderSelectWarehouse')}</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                {t('adjustments.labelNotes')}
                            </label>
                            <input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('adjustments.placeholderNotes')}
                                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    {!selectedWarehouse ? (
                        <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                            <p className="text-xs font-medium text-slate-500">{t('adjustments.msgSelectWarehouseFirst')}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <div className="relative w-full max-w-sm">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={t('adjustments.searchPlaceholder')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                                    />
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    Tổng sản phẩm: <span className="font-bold text-slate-800">{displayItems.length}</span>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="text-center py-12 text-xs font-medium text-slate-500">
                                    {t('adjustments.loadingStock')}
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <Table>
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('transactions.colSku')}</th>
                                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('transactions.colProductName')}</th>
                                                <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('transactions.colUnit')}</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[140px]">{t('adjustments.colSystemQty')}</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[160px]">{t('adjustments.colActualQty')}</th>
                                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[140px]">{t('adjustments.colDiff')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {displayItems.length > 0 ? displayItems.map(item => {
                                                const actual = parseInt(item.actualQty);
                                                const diff = isNaN(actual) ? 0 : actual - item.systemQty;

                                                let diffClass = 'text-slate-400';
                                                let bgClass = '';
                                                if (diff > 0) {
                                                    diffClass = 'text-emerald-600 font-bold';
                                                    bgClass = 'bg-emerald-50/40';
                                                } else if (diff < 0) {
                                                    diffClass = 'text-rose-600 font-bold';
                                                    bgClass = 'bg-rose-50/40';
                                                }

                                                return (
                                                    <tr key={item.product.id} className={`${bgClass} hover:bg-slate-50/80 transition-colors`}>
                                                        <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">{item.product.sku}</td>
                                                        <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{item.product.name}</td>
                                                        <td className="px-4 py-2.5 text-xs text-center text-slate-500">{item.product.unit || '-'}</td>
                                                        <td className="px-4 py-2.5 text-xs text-right font-mono font-semibold text-slate-600">{item.systemQty}</td>
                                                        <td className="px-4 py-2.5 text-xs text-right">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.actualQty}
                                                                onChange={(e) => handleActualChange(item.product.id, e.target.value)}
                                                                className={`w-24 px-2.5 py-1 text-xs text-right font-mono font-bold rounded-lg border focus:outline-none transition-all ${
                                                                    diff !== 0 ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white' : 'border-slate-200 bg-slate-50/50'
                                                                }`}
                                                            />
                                                        </td>
                                                        <td className={`px-4 py-2.5 text-xs text-right font-mono ${diffClass}`}>
                                                            {diff > 0 ? `+${diff}` : diff}
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-10 text-xs font-medium text-slate-400">
                                                        {t('adjustments.noItems')}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button 
                                    type="submit" 
                                    disabled={isSaving || isLoading} 
                                    className="px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-200 transition-all"
                                >
                                    <Save size={15} /> {isSaving ? t('adjustments.btnProcessing') : t('adjustments.btnComplete')}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
