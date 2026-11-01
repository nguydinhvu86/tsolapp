'use client'

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { 
    Plus, Search, Edit, Edit2, Trash2, Package, Layers, X, Eye, 
    ShieldCheck, Shield, Sparkles, Wrench, Barcode, Check, AlertCircle,
    Boxes, Tag, DollarSign, Calendar, Info
} from 'lucide-react';
import { createProduct, updateProduct, deleteProduct, createProductGroup, updateProductGroup, deleteProductGroup } from '../actions';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useTranslation } from '@/app/i18n/LanguageContext';
import { formatMoney, formatTaxRate } from '@/lib/utils/formatters';
import { TaxBadge } from '@/app/components/ui/TaxRateSelect';

const WARRANTY_OPTIONS = [
    { label: 'KBH', months: 0, desc: 'Không bảo hành' },
    { label: '1 tháng', months: 1, desc: '1 tháng' },
    { label: '3 tháng', months: 3, desc: '1 quý' },
    { label: '6 tháng', months: 6, desc: 'Nửa năm' },
    { label: '9 tháng', months: 9, desc: '9 tháng' },
    { label: '12 tháng', months: 12, desc: '1 năm (Chuẩn)' },
    { label: '24 tháng', months: 24, desc: '2 năm' },
    { label: '36 tháng', months: 36, desc: '3 năm' },
    { label: 'Tùy chỉnh', months: -1, desc: 'Nhập số tháng' },
];

const COMMON_UNITS = ['Cái', 'Bộ', 'Chiếc', 'Gói', 'Hộp', 'Mét', 'Bản quyền'];

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

    // Warranty states
    const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
    const [isCustomWarranty, setIsCustomWarranty] = useState<boolean>(false);
    const [customWarrantyInput, setCustomWarrantyInput] = useState<string>('12');

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
        setWarrantyMonths(12);
        setIsCustomWarranty(false);
        setCustomWarrantyInput('12');
        setDescription('');
        setNotes('');
        setGroupId('');
        setIsModalOpen(true);
    };

    const openEditModal = (p: any) => {
        setEditingProduct(p);
        setSku(p.sku);
        setName(p.name);
        setType(p.type);
        setUnit(p.unit || 'Cái');
        setTaxRate((p.taxRate || 0).toString());
        setImportPrice(p.importPrice ? p.importPrice.toString() : '0');
        setSalePrice(p.salePrice ? p.salePrice.toString() : '0');
        setMinStockLevel(p.minStockLevel ? p.minStockLevel.toString() : '10');
        setDescription(p.description || '');
        setNotes(p.notes || '');
        setGroupId(p.groupId || '');

        const wm = (p.warrantyMonths !== undefined && p.warrantyMonths !== null) ? p.warrantyMonths : 12;
        setWarrantyMonths(wm);
        if ([0, 1, 3, 6, 9, 12, 24, 36].includes(wm)) {
            setIsCustomWarranty(false);
            setCustomWarrantyInput(wm.toString());
        } else {
            setIsCustomWarranty(true);
            setCustomWarrantyInput(wm.toString());
        }

        setIsModalOpen(true);
        setViewingProduct(null);
    };

    const handleSelectWarrantyOption = (opt: typeof WARRANTY_OPTIONS[0]) => {
        if (opt.months === -1) {
            setIsCustomWarranty(true);
            if (!customWarrantyInput || customWarrantyInput === '0') {
                setCustomWarrantyInput(warrantyMonths > 0 ? warrantyMonths.toString() : '18');
                setWarrantyMonths(warrantyMonths > 0 ? warrantyMonths : 18);
            }
        } else {
            setIsCustomWarranty(false);
            setWarrantyMonths(opt.months);
            setCustomWarrantyInput(opt.months.toString());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const resolvedWarranty = isCustomWarranty
                ? Math.max(0, parseInt(customWarrantyInput) || 0)
                : warrantyMonths;

            const data = {
                sku: sku.trim(),
                name: name.trim(),
                type,
                unit: unit.trim() || 'Cái',
                taxRate: parseFloat(taxRate) || 0,
                importPrice: parseFloat(importPrice) || 0,
                salePrice: parseFloat(salePrice) || 0,
                minStockLevel: parseInt(minStockLevel) || 0,
                warrantyMonths: resolvedWarranty,
                description: description.trim(),
                notes: notes.trim(),
                isActive: true,
                groupId: groupId || null
            };

            if (editingProduct) {
                await updateProduct(editingProduct.id, data);
                toast.success('Đã cập nhật thông tin sản phẩm thành công!');
            } else {
                await createProduct(data);
                toast.success('Đã thêm mới mặt hàng thành công!');
            }
            setIsModalOpen(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || t('products.genericError'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('products.deletePrompt'))) {
            try {
                await deleteProduct(id);
                toast.success('Đã xóa mặt hàng thành công');
                router.refresh();
            } catch (error) {
                toast.error(t('products.deleteError'));
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
            setEditingGroup(null);
            setGroupName('');
            setGroupDesc('');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || t('products.genericError'));
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
                toast.error(error.message || t('products.groupDeleteError'));
            }
        }
    };

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

    const effectiveWarrantyMonths = isCustomWarranty 
        ? Math.max(0, parseInt(customWarrantyInput) || 0)
        : warrantyMonths;

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
                            Quản lý danh mục hàng hóa, đơn giá, định mức bảo hành và tồn kho ({initialProducts.length} sản phẩm)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setIsGroupModalOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2">
                        <Layers size={14} /> {t('products.manageGroupsBtn')}
                    </Button>
                    <Button onClick={openCreateModal} className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white">
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
                                <th className="px-3 py-3.5 text-center font-bold uppercase tracking-wider text-[11px]">Bảo Hành</th>
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
                                const wMonths = p.warrantyMonths !== undefined && p.warrantyMonths !== null ? p.warrantyMonths : 12;

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
                                        <td className="px-3 py-3.5 text-center">
                                            {wMonths === 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200" title="Không áp dụng bảo hành">
                                                    KBH
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title={`Bảo hành chính hãng ${wMonths} tháng`}>
                                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                                    {wMonths} Tháng
                                                </span>
                                            )}
                                        </td>
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
                                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium text-xs">
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

            {/* Redesigned Professional Create / Edit Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl xl:max-w-6xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/30 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                                    <Package size={22} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-extrabold text-slate-900">
                                            {editingProduct ? 'Chỉnh Sửa Mặt Hàng' : 'Thêm Mới Mặt Hàng & Thiết Bị'}
                                        </h2>
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                            WMS Pro
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Khai báo định danh, phân loại, giá bán và chính sách bảo hành điện tử chính xác
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                            
                            {/* Section 1: Item Type Selector Cards */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    1. Loại Mặt Hàng & Phương Thức Quản Lý <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setType('PRODUCT')}
                                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                                            type === 'PRODUCT'
                                                ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${type === 'PRODUCT' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <Boxes size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-900">Sản phẩm vật lý</span>
                                                {type === 'PRODUCT' && <Check size={14} className="text-emerald-600 font-bold" />}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                                Quản lý tồn kho thực tế, hỗ trợ gắn Serial/IMEI và bảo hành điện tử
                                            </p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setType('SERVICE')}
                                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                                            type === 'SERVICE'
                                                ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${type === 'SERVICE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            <Wrench size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-900">Dịch vụ / Bản quyền</span>
                                                {type === 'SERVICE' && <Check size={14} className="text-blue-600 font-bold" />}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                                Dịch vụ kỹ thuật, giải pháp số hoặc gói cước không lưu kho vật lý
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Section 2: Identification & Classification */}
                            <div className="p-4.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Tag className="w-4 h-4 text-emerald-600" />
                                    2. Thông Tin Định Danh & Phân Loại
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-1">
                                        <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Mã SKU <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                            <Input 
                                                value={sku} 
                                                onChange={(e) => setSku(e.target.value.toUpperCase())} 
                                                required 
                                                placeholder="VD: YEA-T30, SP001" 
                                                className="h-10 pl-9 text-xs font-mono font-bold tracking-wider uppercase border-slate-200 rounded-xl" 
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Tên Mặt Hàng / Sản Phẩm <span className="text-rose-500">*</span>
                                        </label>
                                        <Input 
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)} 
                                            required 
                                            placeholder="Nhập tên chi tiết (VD: Điện thoại Yealink T30P, Windows 11 Pro)..." 
                                            className="h-10 text-xs font-medium border-slate-200 rounded-xl" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Nhóm Sản Phẩm
                                        </label>
                                        <select 
                                            value={groupId} 
                                            onChange={(e) => setGroupId(e.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 shadow-xs"
                                        >
                                            <option value="">-- Không chọn nhóm (Mặc định) --</option>
                                            {productGroups.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Đơn Vị Tính <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="space-y-1.5">
                                            <Input 
                                                value={unit} 
                                                onChange={(e) => setUnit(e.target.value)} 
                                                placeholder="VD: Cái, Bộ, Hộp..." 
                                                required 
                                                className="h-10 text-xs border-slate-200 rounded-xl font-medium" 
                                            />
                                            <div className="flex flex-wrap gap-1">
                                                {COMMON_UNITS.map(u => (
                                                    <button
                                                        key={u}
                                                        type="button"
                                                        onClick={() => setUnit(u)}
                                                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                                                            unit === u ? 'bg-emerald-600 text-white' : 'bg-slate-200/70 hover:bg-slate-300 text-slate-600'
                                                        }`}
                                                    >
                                                        {u}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Pricing & VAT Tax */}
                            <div className="p-4.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <DollarSign className="w-4 h-4 text-emerald-600" />
                                    3. Chính Sách Giá Cả & Thuế GTGT
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {canViewImportPrice ? (
                                        <div>
                                            <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                {t('products.formImportPriceLabel')}
                                            </label>
                                            <Input 
                                                type="number" 
                                                value={importPrice} 
                                                onChange={(e) => setImportPrice(e.target.value)} 
                                                min="0" 
                                                step="1000"
                                                className="h-10 text-xs font-mono font-bold border-slate-200 rounded-xl" 
                                            />
                                            {Number(importPrice) > 0 && (
                                                <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                                                    ≈ {formatMoney(Number(importPrice))}
                                                </span>
                                            )}
                                        </div>
                                    ) : <div />}

                                    <div>
                                        <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            {t('products.formSalePriceLabel')} <span className="text-rose-500">*</span>
                                        </label>
                                        <Input 
                                            type="number" 
                                            value={salePrice} 
                                            onChange={(e) => setSalePrice(e.target.value)} 
                                            min="0" 
                                            step="1000"
                                            required 
                                            className="h-10 text-xs font-mono font-bold text-emerald-700 border-slate-200 rounded-xl" 
                                        />
                                        {Number(salePrice) > 0 && (
                                            <span className="text-[11px] text-emerald-600 font-mono font-bold mt-1 block">
                                                ≈ {formatMoney(Number(salePrice))}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            {t('products.formTaxLabel')}
                                        </label>
                                        <select 
                                            value={taxRate} 
                                            onChange={(e) => setTaxRate(e.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 shadow-xs"
                                        >
                                            <option value="-1">KCT (Không chịu thuế)</option>
                                            <option value="0">0% (Thuế suất 0%)</option>
                                            <option value="5">5% (Thuế suất 5%)</option>
                                            <option value="8">8% (Thuế suất 8%)</option>
                                            <option value="10">10% (Thuế suất 10%)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Electronic Warranty Period (Khung thời gian bảo hành) */}
                            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 border-2 border-emerald-500/40 shadow-xs space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                                                4. Khung Thời Gian Bảo Hành Điện Tử (Serial / IMEI) <span className="text-rose-500">*</span>
                                            </h3>
                                            <p className="text-[11px] text-emerald-700 font-medium">
                                                Quy định thời hạn bảo hành tự động kích hoạt khi xuất bán hàng cho khách
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                            {effectiveWarrantyMonths === 0 ? 'Không bảo hành (KBH)' : `${effectiveWarrantyMonths} Tháng Bảo Hành`}
                                        </span>
                                    </div>
                                </div>

                                {/* Preset Pill Buttons */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                                        {WARRANTY_OPTIONS.map((opt) => {
                                            const isSelected = opt.months === -1 
                                                ? isCustomWarranty 
                                                : (!isCustomWarranty && warrantyMonths === opt.months);

                                            return (
                                                <button
                                                    key={opt.label}
                                                    type="button"
                                                    onClick={() => handleSelectWarrantyOption(opt)}
                                                    className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                                                        isSelected
                                                            ? 'bg-emerald-600 text-white font-extrabold shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500'
                                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 font-semibold'
                                                    }`}
                                                >
                                                    <span className="text-xs leading-none">{opt.label}</span>
                                                    <span className={`text-[9px] mt-0.5 leading-tight ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                                                        {opt.desc}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Custom Warranty Input Block */}
                                    {isCustomWarranty && (
                                        <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-emerald-600" />
                                                <span className="text-xs font-bold text-slate-800">Nhập số tháng bảo hành tùy chỉnh:</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="120"
                                                    value={customWarrantyInput}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setCustomWarrantyInput(val);
                                                        setWarrantyMonths(Math.max(0, parseInt(val) || 0));
                                                    }}
                                                    className="w-24 h-9 px-3 text-center text-sm font-extrabold font-mono text-emerald-800 bg-emerald-50/50 border border-emerald-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="Số tháng"
                                                    required
                                                />
                                                <span className="text-xs font-bold text-slate-700">Tháng</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Live Explanation Preview Card */}
                                    <div className="p-3 rounded-xl bg-white/90 border border-emerald-200/80 text-xs text-slate-700 leading-relaxed">
                                        {effectiveWarrantyMonths === 0 ? (
                                            <div className="flex items-start gap-2 text-slate-600">
                                                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>Mặt hàng KBH (Không bảo hành):</strong> Khi xuất bán hàng hoặc quét Serial/IMEI, hệ thống sẽ <strong>không tính thời hạn bảo hành</strong>. Khi tra cứu trên cổng bảo hành điện tử sẽ hiển thị trạng thái <em>"Không áp dụng bảo hành"</em>.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2 text-emerald-900">
                                                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                                <span>
                                                    <strong>Bảo hành chính hãng {effectiveWarrantyMonths} tháng:</strong> Khi lập hóa đơn bán hàng cho khách, hệ thống sẽ tự động kích hoạt bảo hành điện tử từ <strong>ngày xuất hóa đơn</strong> và tính chính xác ngày hết hạn (sau {effectiveWarrantyMonths} tháng) kèm số ngày còn lại theo thời gian thực.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 5 & 6: Inventory & Specifications (2-Column Grid on Wide Screen) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Left Column: Inventory & Internal Notes */}
                                <div className="space-y-4">
                                    {type === 'PRODUCT' ? (
                                        <div className="p-4.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2.5">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                                <Package className="w-4 h-4 text-emerald-600" />
                                                5. Quản Lý Tồn Kho & Cảnh Báo Định Mức
                                            </h3>
                                            <div>
                                                <label className="block mb-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                    {t('products.formMinStockLabel')}
                                                </label>
                                                <Input 
                                                    type="number" 
                                                    value={minStockLevel} 
                                                    onChange={(e) => setMinStockLevel(e.target.value)} 
                                                    min="0" 
                                                    required 
                                                    className="h-10 text-xs font-mono font-bold border-slate-200 rounded-xl" 
                                                />
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    {t('products.formMinStockHint')}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4.5 bg-blue-50/50 rounded-2xl border border-blue-200/80 text-xs text-blue-800 flex items-start gap-2.5">
                                            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="font-bold">Mặt hàng Dịch vụ / Bản quyền:</strong>
                                                <p className="mt-0.5 text-blue-700 leading-relaxed">
                                                    Không cần quản lý số lượng tồn kho vật lý. Hệ thống cho phép xuất hóa đơn linh hoạt theo nhu cầu.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-4.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                            <Tag className="w-4 h-4 text-emerald-600" />
                                            {t('products.formNotesLabel')}
                                        </h3>
                                        <Input 
                                            value={notes} 
                                            onChange={(e) => setNotes(e.target.value)} 
                                            placeholder="Ghi chú nội bộ dành riêng cho nhân viên kỹ thuật hoặc kho..." 
                                            className="h-10 text-xs border-slate-200 rounded-xl" 
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Detailed Specifications */}
                                <div className="p-4.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-2.5">
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                                            <Edit className="w-4 h-4 text-emerald-600" />
                                            6. {t('products.formDescLabel')} & Thông Số Kỹ Thuật
                                        </h3>
                                        <textarea
                                            value={description} 
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 min-h-[115px] shadow-xs leading-relaxed"
                                            placeholder="Nhập thông số kỹ thuật, cấu hình, tiêu chuẩn xuất xưởng hoặc mô tả chi tiết sản phẩm..."
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        💡 Thông số kỹ thuật sẽ tự động hiển thị trong biên bản bàn giao và chi tiết sản phẩm.
                                    </p>
                                </div>
                            </div>

                            {/* Sticky Modal Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-[11px] text-slate-400 font-medium">
                                    * Các trường có dấu sao đỏ là bắt buộc
                                </span>
                                <div className="flex gap-2">
                                    <Button 
                                        type="button" 
                                        variant="secondary" 
                                        onClick={() => setIsModalOpen(false)} 
                                        className="text-xs px-4 py-2 font-semibold"
                                    >
                                        {t('products.btnCancel')}
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        disabled={isSaving} 
                                        className="text-xs font-bold px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
                                    >
                                        {isSaving ? (
                                            <>
                                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                                                {t('products.btnSaving')}
                                            </>
                                        ) : (
                                            <>
                                                <Check size={15} />
                                                {editingProduct ? 'Cập Nhật Mặt Hàng' : 'Lưu Thông Tin Mặt Hàng'}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Product Detail Modal */}
            {viewingProduct && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">{viewingProduct.name}</h2>
                                <span className="text-xs text-slate-400 font-mono font-semibold">{t('products.viewSku')}: {viewingProduct.sku}</span>
                            </div>
                            <Button
                                onClick={() => openEditModal(viewingProduct)}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Edit size={14} /> {t('products.btnEdit')}
                            </Button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">{t('products.viewGeneralInfo')}</h3>
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewTypeLabel')}:</span><span className="font-semibold">{viewingProduct.type === 'PRODUCT' ? t('products.viewTypeProductValue') : t('products.viewTypeServiceValue')}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewGroupLabel')}:</span><span className="font-semibold">{viewingProduct.group?.name || '-'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewUnitLabel')}:</span><span className="font-semibold">{viewingProduct.unit || 'Cái'}</span></div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Bảo hành điện tử:</span>
                                        <span className="font-bold text-emerald-700">
                                            {viewingProduct.warrantyMonths === 0 ? 'Không áp dụng (KBH)' : `${viewingProduct.warrantyMonths || 12} tháng`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewTaxLabel')}:</span><TaxBadge rate={viewingProduct.taxRate} /></div>
                                    <div className="flex justify-between"><span className="text-slate-400">{t('products.viewMinStockLabel')}:</span><span className="font-bold text-rose-600 font-mono">{viewingProduct.minStockLevel || 0}</span></div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
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
                                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">{viewingProduct.description}</p>
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-200">
                        <div className="p-4.5 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
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
                                <div className="flex gap-2 justify-end">
                                    {editingGroup && (
                                        <Button type="button" variant="secondary" onClick={() => { setEditingGroup(null); setGroupName(''); setGroupDesc(''); }} className="text-xs">{t('products.groupFormBtnCancel')}</Button>
                                    )}
                                    <Button type="submit" disabled={isSavingGroup} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                                        {isSavingGroup ? t('products.groupFormBtnSaving') : (editingGroup ? t('products.groupFormBtnSave') : t('products.groupFormBtnAdd'))}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
