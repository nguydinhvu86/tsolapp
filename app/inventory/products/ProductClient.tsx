'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Plus, Search, Edit, Edit2, Trash2, Package, Layers, X, Eye } from 'lucide-react';
import { createProduct, updateProduct, deleteProduct, createProductGroup, updateProductGroup, deleteProductGroup } from '../actions';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useTranslation } from '@/app/i18n/LanguageContext';
import { formatMoney, formatTaxRate } from '@/lib/utils/formatters';
import { TaxBadge } from '@/app/components/ui/TaxRateSelect';

export default function ProductClient({ initialProducts, warehouses = [], productGroups = [], userRole = 'USER' }: { initialProducts: any[], warehouses?: any[], productGroups?: any[], userRole?: string }) {
    const canViewImportPrice = userRole === 'ADMIN' || userRole === 'MANAGER';
    const router = useRouter();
    const { t } = useTranslation();
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

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('action') === 'new') {
                openCreateModal();
                window.history.replaceState({}, '', '/inventory/products');
            }
        }
    }, []);

    const filtered = initialProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const { paginatedItems, paginationProps } = usePagination(filtered, 25);

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
            alert(error.message || t('products.genericError'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('products.deletePrompt'))) {
            try {
                await deleteProduct(id);
                router.refresh();
            } catch (error) {
                alert(t('products.deleteError'));
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
            alert(error.message || t('products.genericError'));
        } finally {
            setIsSavingGroup(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (confirm(t('products.groupDeletePrompt'))) {
            try {
                await deleteProductGroup(id);
                router.refresh();
            } catch (error: any) {
                alert(error.message || t('products.groupDeleteError'));
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
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>{t('products.chartTitle')}</h3>
                    <div style={{ height: '220px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
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
                                    formatter={(value: any) => [`${new Intl.NumberFormat('vi-VN').format(value)} ${t('products.chartTooltipUnit')}`, t('products.chartTooltipLabel')]}
                                />
                                <Legend verticalAlign="middle" align="right" layout="vertical" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex justify-between items-center flex-wrap gap-3">
                <div className="flex-1 min-w-[220px] max-w-[320px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder={t('products.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-9 pl-9 pr-8 text-[13px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder:text-slate-400 transition-all font-medium"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="w-[200px]">
                    <select
                        value={selectedWarehouseId}
                        onChange={(e) => setSelectedWarehouseId(e.target.value)}
                        className="w-full h-9 px-3 text-[13px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-700 font-medium cursor-pointer"
                    >
                        <option value="">{t('products.warehouseAll')}</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <Button variant="secondary" onClick={() => setIsGroupModalOpen(true)} className="flex items-center gap-1.5 h-9 text-xs">
                        <Layers size={15} /> {t('products.manageGroupsBtn')}
                    </Button>
                    <Button onClick={openCreateModal} className="flex items-center gap-1.5 h-9 text-xs shadow-sm">
                        <Plus size={16} /> {t('products.addProductBtn')}
                    </Button>
                </div>
            </div>

            <div className="table-wrapper !border-none !rounded-none">
                <table>
                    <thead>
                        <tr>
                            <th className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('products.colType')}</th>
                            <th className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('products.colSku')}</th>
                            <th className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('products.colName')}</th>
                            <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('products.colUnit')}</th>
                            <th className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('products.colPrice')}</th>
                            <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('products.colTax')}</th>
                            <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">{selectedWarehouseId ? t('products.colStockWarehouse') : t('products.colStockTotal')}</th>
                            <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 w-[100px]">{t('products.colActions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedItems.length > 0 ? paginatedItems.map((p) => {
                            let displayedStock = 0;
                            if (selectedWarehouseId) {
                                const currentInv = p.inventories?.find((i: any) => i.warehouseId === selectedWarehouseId);
                                displayedStock = currentInv ? currentInv.quantity : 0;
                            } else {
                                displayedStock = p.inventories?.reduce((acc: number, inv: any) => acc + inv.quantity, 0) || 0;
                            }

                            const isLowStock = p.type === 'PRODUCT' && !selectedWarehouseId && displayedStock <= p.minStockLevel;

                            return (
                                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="p-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.type === 'PRODUCT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                            {p.type === 'PRODUCT' ? t('products.typeProduct') : t('products.typeService')}
                                        </span>
                                    </td>
                                    <td className="p-3 font-mono text-[11px] font-semibold text-slate-600">{p.sku}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => setViewingProduct(p)}
                                            className="font-semibold text-[13px] text-slate-900 hover:text-emerald-600 text-left transition-colors"
                                            title={t('products.tooltipViewDetails')}
                                        >
                                            {p.name}
                                        </button>
                                    </td>
                                    <td className="p-3 text-center text-xs text-slate-600">{p.unit || 'Cái'}</td>
                                    <td className="p-3 text-right font-bold text-[13px] text-slate-900">{formatMoney(p.salePrice)}</td>
                                    <td className="p-3 text-center">
                                        <TaxBadge rate={p.taxRate} />
                                    </td>
                                    <td className="p-3 text-center">
                                        {p.type === 'PRODUCT' ? (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isLowStock ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                {displayedStock}
                                            </span>
                                        ) : <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => setViewingProduct(p)}
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title={t('products.tooltipViewDetails')}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(p)}
                                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title={t('products.editProductModalTitle')}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Xóa"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-500 font-medium text-[13px]">
                                    {t('products.noProductsFound')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <Pagination {...paginationProps} />
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
                            {editingProduct ? t('products.modalTitleEdit') : t('products.modalTitleAdd')}
                        </h2>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formTypeLabel')}</label>
                                    <select value={type} onChange={(e) => setType(e.target.value as any)}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                        <option value="PRODUCT">{t('products.formTypeProduct')}</option>
                                        <option value="SERVICE">{t('products.formTypeService')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formSkuLabel')}</label>
                                    <Input value={sku} onChange={(e) => setSku(e.target.value)} required placeholder={t('products.formSkuPlaceholder')} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formNameLabel')}</label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t('products.formNamePlaceholder')} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formGroupLabel')}</label>
                                    <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                        <option value="">{t('products.formGroupNone')}</option>
                                        {productGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formUnitLabel')}</label>
                                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t('products.formUnitPlaceholder')} required />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formTaxLabel')}</label>
                                    <select value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
                                        style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                        <option value="-1">KCT (Không chịu thuế)</option>
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="8">8%</option>
                                        <option value="10">10%</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {canViewImportPrice ? (
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formImportPriceLabel')}</label>
                                        <Input type="number" value={importPrice} onChange={(e) => setImportPrice(e.target.value)} min="0" />
                                    </div>
                                ) : <div />}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formSalePriceLabel')}</label>
                                    <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} min="0" required />
                                </div>
                            </div>

                            {type === 'PRODUCT' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formMinStockLabel')}</label>
                                    <Input type="number" value={minStockLevel} onChange={(e) => setMinStockLevel(e.target.value)} min="0" required />
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t('products.formMinStockHint')}</p>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formDescLabel')}</label>
                                <textarea
                                    value={description} onChange={(e) => setDescription(e.target.value)}
                                    style={{ width: '100%', padding: '0.625rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minHeight: '80px', outline: 'none', resize: 'vertical' }}
                                    placeholder={t('products.formDescPlaceholder')}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.formNotesLabel')}</label>
                                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('products.formNotesPlaceholder')} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>{t('products.btnCancel')}</Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? t('products.btnSaving') : t('products.btnSave')}
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
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t('products.viewSku')} {viewingProduct.sku}</span>
                            </div>
                            <Button
                                onClick={() => openEditModal(viewingProduct)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: 'white' }}
                            >
                                <Edit size={16} /> {t('products.btnEdit')}
                            </Button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>{t('products.viewGeneralInfo')}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{t('products.viewTypeLabel')}</span>
                                    <span style={{ fontWeight: 500 }}>{viewingProduct.type === 'PRODUCT' ? t('products.viewTypeProductValue') : t('products.viewTypeServiceValue')}</span>

                                    <span style={{ color: 'var(--text-muted)' }}>{t('products.viewGroupLabel')}</span>
                                    <span style={{ fontWeight: 500 }}>{viewingProduct.group?.name || '-'}</span>

                                    <span style={{ color: 'var(--text-muted)' }}>{t('products.viewUnitLabel')}</span>
                                    <span style={{ fontWeight: 500 }}>{viewingProduct.unit || 'Cái'}</span>

                                    <span style={{ color: 'var(--text-muted)' }}>{t('products.viewTaxLabel')}</span>
                                    <span style={{ fontWeight: 500 }}>
                                        <TaxBadge rate={viewingProduct.taxRate} />
                                    </span>

                                    <span style={{ color: 'var(--text-muted)' }}>{t('products.viewMinStockLabel')}</span>
                                    <span style={{ fontWeight: 500, color: 'var(--danger)' }}>{viewingProduct.minStockLevel || 0}</span>
                                </div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>{t('products.viewPricing')}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                                    {canViewImportPrice && (
                                        <>
                                            <span style={{ color: 'var(--text-muted)' }}>{t('products.viewImportPriceLabel')}</span>
                                            <span style={{ fontWeight: 500 }}>{formatMoney(viewingProduct.importPrice)}</span>
                                        </>
                                    )}

                                    <span style={{ color: 'var(--text-muted)' }}>{t('products.viewSalePriceLabel')}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatMoney(viewingProduct.salePrice)}</span>
                                </div>
                            </div>
                        </div>

                        {viewingProduct.type === 'PRODUCT' && viewingProduct.inventories && viewingProduct.inventories.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>{t('products.viewActualStock')} ({viewingProduct.inventories.reduce((acc: number, inv: any) => acc + inv.quantity, 0)} {viewingProduct.unit})</h3>
                                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                        <thead style={{ background: '#f1f5f9' }}>
                                            <tr>
                                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>{t('products.viewColWarehouse')}</th>
                                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>{t('products.viewColQuantity')}</th>
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
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>{t('products.viewDescriptionLabel')}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{viewingProduct.description || t('products.viewNoDescription')}</p>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>{t('products.viewNotesLabel')}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{viewingProduct.notes || t('products.viewNoNotes')}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <Button type="button" variant="secondary" onClick={() => setViewingProduct(null)}>{t('products.btnClose')}</Button>
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
                            {t('products.groupModalTitle')}
                        </h2>

                        <div style={{ display: 'flex', gap: '1.5rem', flexDirection: 'column' }}>
                            {/* Group List */}
                            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>{t('products.groupColName')}</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>{t('products.groupColDesc')}</th>
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
                                                <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>{t('products.groupNoGroups')}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Group Form */}
                            <form onSubmit={handleGroupSubmit} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                                    {editingGroup ? t('products.groupFormTitleEdit') : t('products.groupFormTitleAdd')}
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.groupFormNameLabel')}</label>
                                        <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} required placeholder={t('products.groupFormNamePlaceholder')} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('products.groupFormDescLabel')}</label>
                                        <Input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder={t('products.groupFormDescPlaceholder')} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {editingGroup && (
                                            <Button type="button" variant="secondary" onClick={() => { setEditingGroup(null); setGroupName(''); setGroupDesc(''); }}>{t('products.groupBtnCancelEdit')}</Button>
                                        )}
                                        <Button type="submit" disabled={isSavingGroup} style={{ flex: 1 }}>
                                            {isSavingGroup ? t('products.groupBtnSaving') : (editingGroup ? t('products.groupBtnUpdate') : t('products.groupBtnAdd'))}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                            <Button type="button" variant="secondary" onClick={() => setIsGroupModalOpen(false)}>{t('products.btnClose')}</Button>
                        </div>
                    </Card>
                </div>
            )}
        </Card>
    );
}
