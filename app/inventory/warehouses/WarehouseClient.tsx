'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Plus, Edit, Home } from 'lucide-react';
import { createWarehouse, updateWarehouse } from '../actions';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/app/i18n/LanguageContext';

export default function WarehouseClient({ initialWarehouses }: { initialWarehouses: any[] }) {
    const router = useRouter();
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    const { paginatedItems, paginationProps } = usePagination(initialWarehouses, 25);

    const openCreateModal = () => {
        setEditingNode(null);
        setName('');
        setLocation('');
        setIsDefault(initialWarehouses.length === 0);
        setIsModalOpen(true);
    };

    const openEditModal = (w: any) => {
        setEditingNode(w);
        setName(w.name);
        setLocation(w.location || '');
        setIsDefault(w.isDefault);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const data = { name, location, isDefault };
            if (editingNode) {
                await updateWarehouse(editingNode.id, data);
            } else {
                await createWarehouse(data);
            }
            setIsModalOpen(false);
            router.refresh();
        } catch (error: any) {
            alert(error.message || t('warehouses.genericError'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <Home size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                            Danh Sách Kho Hàng
                        </h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Quản lý các kho lưu trữ và vị trí hàng hóa ({initialWarehouses.length} kho)
                        </p>
                    </div>
                </div>

                <div>
                    <Button onClick={openCreateModal} className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 shadow-xs">
                        <Plus size={15} /> {t('warehouses.addBtn')}
                    </Button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">{t('warehouses.colName')}</th>
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px]">{t('warehouses.colLocation')}</th>
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px] text-center">{t('warehouses.colType')}</th>
                                <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-[11px] text-right w-[100px]">{t('warehouses.colActions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedItems.length > 0 ? paginatedItems.map((w) => (
                                <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-3.5 font-semibold text-slate-900 text-xs">{w.name}</td>
                                    <td className="px-4 py-3.5 text-slate-500 text-xs">{w.location || '-'}</td>
                                    <td className="px-4 py-3.5 text-center">
                                        {w.isDefault ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                                                <Home size={11} /> {t('warehouses.defaultLabel')}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs font-medium">{t('warehouses.secondaryLabel')}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3.5 text-right">
                                        <button 
                                            onClick={() => openEditModal(w)} 
                                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            title={t('warehouses.modalTitleEdit')}
                                        >
                                            <Edit size={15} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-12 text-slate-400 font-medium text-xs">
                                        {t('warehouses.noWarehouses')}
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                            <h2 className="text-sm font-bold text-slate-900">
                                {editingNode ? t('warehouses.modalTitleEdit') : t('warehouses.modalTitleAdd')}
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block mb-1.5 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('warehouses.formNameLabel')}</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t('warehouses.formNamePlaceholder')} className="h-9.5 text-xs" />
                            </div>

                            <div>
                                <label className="block mb-1.5 font-bold text-xs text-slate-700 uppercase tracking-wider">{t('warehouses.formLocationLabel')}</label>
                                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('warehouses.formLocationPlaceholder')} className="h-9.5 text-xs" />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer mt-2 pt-2 border-t border-slate-100">
                                <input
                                    type="checkbox"
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-semibold text-xs text-slate-700">{t('warehouses.formSetDefaultLabel')}</span>
                            </label>
                            {isDefault && <p className="text-[11px] text-slate-400 ml-6">{t('warehouses.formSetDefaultHint')}</p>}

                            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="text-xs">{t('warehouses.btnCancel')}</Button>
                                <Button type="submit" disabled={isSaving} className="text-xs font-semibold">
                                    {isSaving ? t('warehouses.btnSaving') : t('warehouses.btnSave')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
