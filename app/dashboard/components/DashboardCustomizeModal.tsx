'use client';

import React, { useState } from 'react';
import {
    X,
    Check,
    DollarSign,
    Filter,
    TrendingUp,
    Users,
    Trophy,
    Receipt,
    Target,
    CheckCircle2,
    Calendar,
    ChevronUp,
    ChevronDown,
    RotateCcw,
    Sparkles,
    Eye,
    EyeOff,
    Layers,
    Save
} from 'lucide-react';
import { WIDGET_REGISTRY, WidgetConfigItem, WidgetRegistryItem } from './DashboardTypes';

interface DashboardCustomizeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLayout: WidgetConfigItem[];
    onSave: (newLayout: WidgetConfigItem[]) => Promise<void>;
    isAdminOrManager: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
    DollarSign,
    Filter,
    TrendingUp,
    Users,
    Trophy,
    Receipt,
    Target,
    CheckCircle2,
    Calendar,
};

export function DashboardCustomizeModal({
    isOpen,
    onClose,
    currentLayout,
    onSave,
    isAdminOrManager,
}: DashboardCustomizeModalProps) {
    const [layout, setLayout] = useState<WidgetConfigItem[]>(currentLayout);
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'finance' | 'sales' | 'operations'>('all');
    const [isSaving, setIsSaving] = useState(false);

    // Sync state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setLayout(currentLayout);
        }
    }, [isOpen, currentLayout]);

    if (!isOpen) return null;

    // Toggle single widget visibility
    const handleToggleVisibility = (id: string) => {
        setLayout(prev => prev.map(item => item.id === id ? { ...item, visible: !item.visible } : item));
    };

    // Move widget up
    const handleMoveUp = (index: number) => {
        if (index <= 0) return;
        setLayout(prev => {
            const next = [...prev];
            const temp = next[index - 1];
            next[index - 1] = next[index];
            next[index] = temp;
            return next;
        });
    };

    // Move widget down
    const handleMoveDown = (index: number) => {
        if (index >= layout.length - 1) return;
        setLayout(prev => {
            const next = [...prev];
            const temp = next[index + 1];
            next[index + 1] = next[index];
            next[index] = temp;
            return next;
        });
    };

    // Apply quick presets
    const handleApplyPreset = (preset: 'all' | 'sales' | 'finance' | 'minimal') => {
        if (preset === 'all') {
            setLayout(prev => prev.map(item => ({ ...item, visible: true })));
        } else if (preset === 'sales') {
            const salesIds = new Set(['kpi_cards', 'sales_pipeline_funnel', 'top_customers_chart', 'sales_performance_leaderboard', 'my_leads_status']);
            setLayout(prev => prev.map(item => ({ ...item, visible: salesIds.has(item.id) })));
        } else if (preset === 'finance') {
            const financeIds = new Set(['kpi_cards', 'cash_flow_chart', 'invoice_status_distribution', 'top_customers_chart']);
            setLayout(prev => prev.map(item => ({ ...item, visible: financeIds.has(item.id) })));
        } else if (preset === 'minimal') {
            const minIds = new Set(['kpi_cards', 'my_work_todo', 'dashboard_calendar']);
            setLayout(prev => prev.map(item => ({ ...item, visible: minIds.has(item.id) })));
        }
    };

    // Reset to initial registry order
    const handleResetDefault = () => {
        setLayout(WIDGET_REGISTRY.map(w => ({ id: w.id, visible: w.defaultVisible })));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(layout);
            onClose();
        } catch (e) {
            console.error('Failed to save layout', e);
        } finally {
            setIsSaving(false);
        }
    };

    const visibleCount = layout.filter(l => l.visible).length;

    // Filter layout items based on category
    const filteredItems = layout.filter(item => {
        const meta = WIDGET_REGISTRY.find(w => w.id === item.id);
        if (!meta) return false;
        if (meta.adminOnly && !isAdminOrManager) return false;
        if (selectedCategory === 'all') return true;
        return meta.category === selectedCategory;
    });

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-emerald-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20 shrink-0">
                            <Layers size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900">Tùy chỉnh Bố cục & Biểu đồ Dashboard</h3>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                    Đang hiện: {visibleCount}/{layout.length}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Bật/tắt và chọn vị trí sắp xếp để tạo giao diện làm việc tối ưu nhất cho bạn
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
                    {/* Quick Presets Bar */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <Sparkles size={14} className="text-amber-500" />
                            <span>Bố cục nhanh theo vai trò:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleApplyPreset('all')}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/40 transition-all shadow-2xs"
                            >
                                🌟 Đầy đủ ({WIDGET_REGISTRY.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApplyPreset('sales')}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/40 transition-all shadow-2xs"
                            >
                                💼 Kinh doanh (Sales)
                            </button>
                            {isAdminOrManager && (
                                <button
                                    type="button"
                                    onClick={() => handleApplyPreset('finance')}
                                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50/40 transition-all shadow-2xs"
                                >
                                    💰 Tài chính (Finance)
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => handleApplyPreset('minimal')}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-2xs"
                            >
                                ⚡ Tối giản (Minimal)
                            </button>
                        </div>
                    </div>

                    {/* Filter Category Pills */}
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                selectedCategory === 'all'
                                    ? 'bg-slate-800 text-white shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            Tất cả ({layout.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('finance')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                selectedCategory === 'finance'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            Tài chính & Doanh số
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('sales')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                selectedCategory === 'sales'
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            Khách hàng & Bán hàng
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedCategory('operations')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                selectedCategory === 'operations'
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            Công việc & Lịch biểu
                        </button>
                    </div>

                    {/* Widget Reordering & Visibility List */}
                    <div className="space-y-2">
                        {filteredItems.map((item) => {
                            const meta = WIDGET_REGISTRY.find(w => w.id === item.id);
                            if (!meta) return null;

                            const actualIndex = layout.findIndex(l => l.id === item.id);
                            const IconComponent = ICON_MAP[meta.iconName] || Layers;

                            return (
                                <div
                                    key={item.id}
                                    className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                                        item.visible
                                            ? 'bg-white border-slate-200/90 shadow-2xs hover:border-emerald-300'
                                            : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                                    }`}
                                >
                                    {/* Left: Position Badge + Icon + Info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                                            #{actualIndex + 1}
                                        </span>

                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                            meta.category === 'finance'
                                                ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20'
                                                : meta.category === 'sales'
                                                ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/20'
                                                : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20'
                                        }`}>
                                            <IconComponent size={18} />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                                    {meta.title}
                                                </h4>
                                                {meta.adminOnly && (
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                        Quản lý
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-[400px]">
                                                {meta.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Order Arrows + Show/Hide Toggle */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Order Up/Down Buttons */}
                                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/70">
                                            <button
                                                type="button"
                                                onClick={() => handleMoveUp(actualIndex)}
                                                disabled={actualIndex === 0}
                                                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                                title="Di chuyển lên trên"
                                            >
                                                <ChevronUp size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMoveDown(actualIndex)}
                                                disabled={actualIndex === layout.length - 1}
                                                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                                title="Di chuyển xuống dưới"
                                            >
                                                <ChevronDown size={15} />
                                            </button>
                                        </div>

                                        {/* Switch Toggle Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleVisibility(item.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                                item.visible
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
                                                    : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                            }`}
                                        >
                                            {item.visible ? (
                                                <>
                                                    <Eye size={13} className="text-emerald-600" />
                                                    <span>Hiển thị</span>
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff size={13} />
                                                    <span>Đã ẩn</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <button
                        type="button"
                        onClick={handleResetDefault}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors border border-transparent"
                    >
                        <RotateCcw size={13} />
                        <span>Khôi phục mặc định</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-xs disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            <span>Lưu & Áp dụng</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
