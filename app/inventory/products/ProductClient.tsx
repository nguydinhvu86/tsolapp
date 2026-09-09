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
        <div className="space-y-5">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <Package size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                            Sản Phẩm & Dịch Vụ
                        </h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Quản lý danh mục hàng hóa, đơn giá và lượng tồn kho ({initialProducts.length} sản phẩm)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setIsGroupModalOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2">
                        <Layers size={14} /> {t('products.manageGroupsBtn')}
                    </Button>
                    <Button onClick={openCreateModal} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 shadow-xs">
                        <Plus size={15} /> {t('products.addProductBtn')}
                    </Button>
                </div>
            </div>

            {/* Inventory Chart (if has stock) */}
            {warehouseStockData.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">{t('products.chartTitle')}</h3>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                            <PieChart>
                                <Pie
                                    data={warehouseStockData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={35}
                                    outerRadius={75}
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

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-3.5 border-b border-slate-200/90 bg-slate-50/50 flex justify-between items-center flex-wrap gap-3">
                    <div className="flex-1 min-w-[220px] max-w-[320px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder={t('products.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-9 pl-9 pr-8 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder:text-slate-400 font-medium"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div className="w-[200px]">
                        <select
                            value={selectedWarehouseId}
                            onChange={(e) => setSelectedWarehouseId(e.target.value)}
                            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-700 font-semibold cursor-pointer shadow-xs"
                        >
                            <option value="">{t('products.warehouseAll')}</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">{t('products.colType')}</th>
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">{t('products.colSku')}</th>
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">{t('products.colName')}</th>
                                <th className="px-4 py-3.5 text-center font-bold uppercase tracking-wider text-[11px]">{t('products.colUnit')}</th>
                                <th className="px-4 py-3.5 text-right font-bold uppercase tracking-wider text-[11px]">{t('products.colPrice')}</th>
                                <th className="px-4 py-3.5 text-center font-bold uppercase tracking-wider text-[11px]">{t('products.colTax')}</th>
                                <th className="px-4 py-3.5 text-center font-bold uppercase tracking-wider text-[11px]">{selectedWarehouseId ? t('products.colStockWarehouse') : t('products.colStockTotal')}</th>
                                <th className="px-4 py-3.5 text-center font-bold uppercase tracking-wider text-[11px] w-[100px]">{t('products.colActions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
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
                                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${p.type === 'PRODUCT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                                {p.type === 'PRODUCT' ? t('products.typeProduct') : t('products.typeService')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-500">{p.sku}</td>
                                        <td className="px-4 py-3.5">
                                            <button
                                                onClick={() => setViewingProduct(p)}
                                                className="font-semibold text-xs text-slate-900 hover:text-emerald-600 text-left transition-colors"
                                                title={t('products.tooltipViewDetails')}
                                            >
                                                {p.name}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3.5 text-center text-xs text-slate-600">{p.unit || 'Cái'}</td>
                                        <td className="px-4 py-3.5 text-right font-bold text-xs text-slate-900 font-mono">{formatMoney(p.salePrice)}</td>
                                        <td className="px-4 py-3.5 text-center">
                                            <TaxBadge rate={p.taxRate} />
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            {p.type === 'PRODUCT' ? (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${isLowStock ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                    {displayedStock}
                                                </span>
                                            ) : <span className="text-slate-400">-</span>}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => setViewingProduct(p)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title={t('products.tooltipViewDetails')}
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(p)}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title={t('products.editProductModalTitle')}
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium text-xs">
                                        {t('products.noProductsFound')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3.5 border-t border-slate-100 bg-slate-50/40">
                    <Pagination {...paginationProps} />
                </div>
            </div>

            {/* Create/Edit Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                            <h2 className="text-sm font-bold text-slate-900">
                                {editingProduct ? t('products.modalTitleEdit') : t('products.modalTitleAdd')}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formTypeLabel')}</label>
                                    <select value={type} onChange={(e) => setType(e.target.value as any)}
                                        className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500">
                                        <option value="PRODUCT">{t('products.formTypeProduct')}</option>
                                        <option value="SERVICE">{t('products.formTypeService')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formSkuLabel')}</label>
                                    <Input value={sku} onChange={(e) => setSku(e.target.value)} required placeholder={t('products.formSkuPlaceholder')} className="h-9.5 text-xs font-mono" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formNameLabel')}</label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t('products.formNamePlaceholder')} className="h-9.5 text-xs" />
                                </div>
                                <div>
                                    <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formGroupLabel')}</label>
                                    <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
                                        className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500">
                                        <option value="">{t('products.formGroupNone')}</option>
                                        {productGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formUnitLabel')}</label>
                                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t('products.formUnitPlaceholder')} required className="h-9.5 text-xs" />
                                </div>
                                <div>
                                    <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formTaxLabel')}</label>
                                    <select value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
                                        className="w-full h-9.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500">
                                        <option value="-1">KCT (Không chịu thuế)</option>
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="8">8%</option>
                                        <option value="10">10%</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {canViewImportPrice ? (
                                    <div>
                                        <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formImportPriceLabel')}</label>
                                        <Input type="number" value={importPrice} onChange={(e) => setImportPrice(e.target.value)} min="0" className="h-9.5 text-xs font-mono" />
                                    </div>
                                ) : <div />}
                                <div>
                                    <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formSalePriceLabel')}</label>
                                    <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} min="0" required className="h-9.5 text-xs font-mono" />
                                </div>
                            </div>

                            {type === 'PRODUCT' && (
                                <div>
                                    <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formMinStockLabel')}</label>
                                    <Input type="number" value={minStockLevel} onChange={(e) => setMinStockLevel(e.target.value)} min="0" required className="h-9.5 text-xs font-mono" />
                                    <p className="text-[11px] text-slate-400 mt-1">{t('products.formMinStockHint')}</p>
                                </div>
                            )}

                            <div>
                                <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formDescLabel')}</label>
                                <textarea
                                    value={description} onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 min-h-[70px]"
                                    placeholder={t('products.formDescPlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="block mb-1 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('products.formNotesLabel')}</label>
                                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('products.formNotesPlaceholder')} className="h-9.5 text-xs" />
                            </div>

                            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="text-xs">{t('products.btnCancel')}</Button>
                                <Button type="submit" disabled={isSaving} className="text-xs font-semibold">
                                    {isSaving ? t('products.btnSaving') : t('products.btnSave')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Product Detail Modal */}
            {viewingProduct && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">{viewingProduct.name}</h2>
                                <span className="text-xs text-slate-400 font-mono">{t('products.viewSku')}: {viewingProduct.sku}</span>
                            </div>
                            <Button
                                onClick={() => openEditModal(viewingProduct)}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5"
                            >
                                <Edit size={14} /> {t('products.btnEdit')}
                            </Button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
                                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">{t('products.viewGeneralInfo')}</h3>
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewTypeLabel')}:</span><span className="font-semibold">{viewingProduct.type === 'PRODUCT' ? t('products.viewTypeProductValue') : t('products.viewTypeServiceValue')}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewGroupLabel')}:</span><span className="font-semibold">{viewingProduct.group?.name || '-'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewUnitLabel')}:</span><span className="font-semibold">{viewingProduct.unit || 'Cái'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewTaxLabel')}:</span><TaxBadge rate={viewingProduct.taxRate} /></div>
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewMinStockLabel')}:</span><span className="font-bold text-rose-600 font-mono">{viewingProduct.minStockLevel || 0}</span></div>
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
                                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">{t('products.viewPricing')}</h3>
                                    {canViewImportPrice && (
                                        <div className="flex justify-between"><span className="text-slate-400">{t('products.viewImportPriceLabel')}:</span><span className="font-bold font-mono text-slate-700">{formatMoney(viewingProduct.importPrice)}</span></div>
                                    )}
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewSalePriceLabel')}:</span><span className="font-extrabold font-mono text-emerald-700">{formatMoney(viewingProduct.salePrice)}</span></div>
                                </div>
                            </div>

                            {viewingProduct.type === 'PRODUCT' && viewingProduct.inventories && viewingProduct.inventories.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">{t('products.viewActualStock')} ({viewingProduct.inventories.reduce((acc: number, inv: any) => acc + inv.quantity, 0)} {viewingProduct.unit})</h3>
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px]">
                                                <tr>
                                                    <th className="p-2.5 text-left">{t('products.viewColWarehouse')}</th>
                                                    <th className="p-2.5 text-right">{t('products.viewColQuantity')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {viewingProduct.inventories.map((inv: any) => (
                                                    <tr key={inv.id}>
                                                        <td className="p-2.5">{inv.warehouse.name}</td>
                                                        <td className="p-2.5 text-right font-bold font-mono text-slate-900">{inv.quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {viewingProduct.description && (
                                <div>
                                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-1">{t('products.viewDescriptionLabel')}</h3>
                                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-wrap">{viewingProduct.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
                            <Button type="button" variant="secondary" onClick={() => setViewingProduct(null)} className="text-xs">{t('products.btnClose')}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Groups Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                            <h2 className="text-sm font-bold text-slate-900">{t('products.groupModalTitle')}</h2>
                            <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px]">
                                        <tr>
                                            <th className="p-2.5 text-left">{t('products.groupColName')}</th>
                                            <th className="p-2.5 text-left">{t('products.groupColDesc')}</th>
                                            <th className="p-2.5 w-[70px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {productGroups.map(g => (
                                            <tr key={g.id}>
                                                <td className="p-2.5 font-semibold text-slate-900">{g.name}</td>
                                                <td className="p-2.5 text-slate-500">{g.description || '-'}</td>
                                                <td className="p-2.5 text-right">
                                                    <div className="flex gap-1 justify-end">
                                                        <button onClick={() => { setEditingGroup(g); setGroupName(g.name); setGroupDesc(g.description || ''); }} className="p-1 text-slate-400 hover:text-emerald-600"><Edit size={14} /></button>
                                                        <button onClick={() => handleDeleteGroup(g.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {productGroups.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-4 text-center text-slate-400">{t('products.groupNoGroups')}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <form onSubmit={handleGroupSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    {editingGroup ? t('products.groupFormTitleEdit') : t('products.groupFormTitleAdd')}
                                </h3>
                                <div>
                                    <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} required placeholder={t('products.groupFormNamePlaceholder')} className="h-9 text-xs" />
                                </div>
                                <div>
                                    <Input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder={t('products.groupFormDescPlaceholder')} className="h-9 text-xs" />
                                </div>
                                <div className="flex gap-2">
                                    {editingGroup && (
                                        <Button type="button" variant="secondary" onClick={() => { setEditingGroup(null); setGroupName(''); setGroupDesc(''); }} className="text-xs">{t('products.groupBtnCancelEdit')}</Button>
                                    )}
                                    <Button type="submit" disabled={isSavingGroup} className="flex-1 text-xs font-semibold">
                                        {isSavingGroup ? t('products.groupBtnSaving') : (editingGroup ? t('products.groupBtnUpdate') : t('products.groupBtnAdd'))}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
                            <Button type="button" variant="secondary" onClick={() => setIsGroupModalOpen(false)} className="text-xs">{t('products.btnClose')}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
