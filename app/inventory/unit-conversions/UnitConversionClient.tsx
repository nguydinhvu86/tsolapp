'use client'

import React, { useState, useEffect } from 'react';
import { 
    Layers, 
    Plus, 
    Trash2, 
    Save, 
    RefreshCw, 
    Package, 
    Check, 
    Scale,
    ArrowRight
} from 'lucide-react';
import { fetchUnitConversions, saveUnitConversions } from './actions';

export default function UnitConversionClient() {
    const [conversions, setConversions] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // List of units for the selected product
    const [unitList, setUnitList] = useState<Array<{
        unitName: string;
        conversionRate: number;
        isBaseUnit: boolean;
        salePrice?: number;
    }>>([]);

    const loadData = async () => {
        setLoading(true);
        const res = await fetchUnitConversions();
        if (res.success) {
            setConversions(res.conversions || []);
            setProducts(res.products || []);
            if (res.products && res.products.length > 0 && !selectedProductId) {
                handleSelectProduct(res.products[0].id, res.conversions || [], res.products[0]);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSelectProduct = (productId: string, currentConversions = conversions, prodObj?: any) => {
        setSelectedProductId(productId);
        const prod = prodObj || products.find(p => p.id === productId);
        const existing = currentConversions.filter(c => c.productId === productId);

        if (existing.length > 0) {
            setUnitList(existing.map(c => ({
                unitName: c.unitName,
                conversionRate: c.conversionRate,
                isBaseUnit: c.isBaseUnit,
                salePrice: c.salePrice || undefined
            })));
        } else if (prod) {
            // Default base unit from product.unit
            setUnitList([
                {
                    unitName: prod.unit || 'Cái',
                    conversionRate: 1,
                    isBaseUnit: true,
                    salePrice: prod.salePrice || 0
                }
            ]);
        }
    };

    const addUnitRow = () => {
        setUnitList([
            ...unitList,
            { unitName: '', conversionRate: 1, isBaseUnit: false, salePrice: 0 }
        ]);
    };

    const removeUnitRow = (index: number) => {
        if (unitList[index].isBaseUnit) {
            alert('Không thể xóa đơn vị tính cơ sở');
            return;
        }
        setUnitList(unitList.filter((_, i) => i !== index));
    };

    const handleUnitChange = (index: number, field: string, val: any) => {
        const updated = [...unitList];
        (updated[index] as any)[field] = val;
        setUnitList(updated);
    };

    const handleSave = async () => {
        if (!selectedProductId) return;
        setSaving(true);
        const res = await saveUnitConversions(selectedProductId, unitList);
        setSaving(false);
        if (res.success) {
            alert('Lưu cấu hình quy đổi đơn vị tính thành công!');
            loadData();
        } else {
            alert(res.error || 'Lỗi khi lưu cấu hình');
        }
    };

    const selectedProduct = products.find(p => p.id === selectedProductId);

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                        <Scale className="w-5 h-5" /> Quản Trị Kho & Đơn Vị Đo Lường
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Đơn Vị Tính Đa Cấp & Bảng Quy Đổi</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Cấu hình quy đổi linh hoạt đa cấp độ (Thùng -&gt; Hộp -&gt; Cái / Mét / Kg) kèm giá bán riêng cho từng đơn vị
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product List */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-600" /> Danh Sách Sản Phẩm
                    </h3>
                    <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                        {products.map(p => {
                            const isSelected = p.id === selectedProductId;
                            const convCount = conversions.filter(c => c.productId === p.id).length;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelectProduct(p.id)}
                                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                                        isSelected
                                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100'
                                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-sm truncate">{p.name}</span>
                                        {convCount > 0 && (
                                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                                                {convCount} ĐVT
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400">ĐVT cơ sở: {p.unit || 'Cái'}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Conversion Settings Form */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    {selectedProduct ? (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {selectedProduct.name}
                                    </h3>
                                    <p className="text-xs text-slate-500">Mã: {selectedProduct.code} | ĐVT Gốc: {selectedProduct.unit || 'Cái'}</p>
                                </div>
                                <button
                                    onClick={addUnitRow}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Thêm Cấp Quy Đổi
                                </button>
                            </div>

                            {/* Table of Units */}
                            <div className="space-y-3">
                                {unitList.map((unit, idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-sm">
                                        <div className="sm:col-span-4">
                                            <label className="block text-xs text-slate-500 font-medium mb-1">Tên Đơn Vị Tính</label>
                                            <input
                                                type="text"
                                                value={unit.unitName}
                                                onChange={(e) => handleUnitChange(idx, 'unitName', e.target.value)}
                                                placeholder="VD: Thùng, Hộp..."
                                                disabled={unit.isBaseUnit}
                                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold disabled:bg-slate-100 dark:disabled:bg-slate-800/80"
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label className="block text-xs text-slate-500 font-medium mb-1">Tỷ lệ quy đổi (ra ĐVT cơ sở)</label>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="0.001"
                                                    step="any"
                                                    value={unit.conversionRate}
                                                    onChange={(e) => handleUnitChange(idx, 'conversionRate', parseFloat(e.target.value) || 1)}
                                                    disabled={unit.isBaseUnit}
                                                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-blue-600 disabled:bg-slate-100"
                                                />
                                            </div>
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label className="block text-xs text-slate-500 font-medium mb-1">Giá Bán Riêng (VNĐ)</label>
                                            <input
                                                type="number"
                                                value={unit.salePrice || 0}
                                                onChange={(e) => handleUnitChange(idx, 'salePrice', parseFloat(e.target.value) || 0)}
                                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                            />
                                        </div>

                                        <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-4 sm:pt-0">
                                            {unit.isBaseUnit ? (
                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-semibold">
                                                    ĐVT Gốc
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => removeUnitRow(idx)}
                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end pt-4">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all"
                                >
                                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Lưu Thiết Lập Quy Đổi
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="p-12 text-center text-slate-400">
                            Vui lòng chọn một sản phẩm từ danh sách bên trái để cấu hình quy đổi.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
