'use client'

import React, { useState, useEffect } from 'react';
import { ContractTemplate, Customer } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { DynamicTableBuilder } from '@/app/components/ui/DynamicTableBuilder';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { createContract } from '../actions';
import { useRouter } from 'next/navigation';

export function NewContractClient({ templates, customers, projects, preselectedCustomerId, preselectedProjectId }: { templates: ContractTemplate[], customers: Customer[], projects: any[], preselectedCustomerId?: string, preselectedProjectId?: string }) {
    const router = useRouter();
    const [templateId, setTemplateId] = useState('');
    const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
    const [projectId, setProjectId] = useState(preselectedProjectId || '');
    const [customTitle, setCustomTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [variables, setVariables] = useState<Record<string, string>>({});
    const [previewContent, setPreviewContent] = useState('');

    const selectedTemplate = templates.find(t => t.id === templateId);
    const selectedCustomer = customers.find(c => c.id === customerId);

    // Auto-update title when customer changes unless user manually typed
    useEffect(() => {
        if (selectedCustomer && !customTitle) {
            setCustomTitle(`Hợp đồng - ${selectedCustomer.name} - ${new Date().toLocaleDateString('vi-VN')}`);
        }
    }, [selectedCustomer]);

    // Extract variables from template
    useEffect(() => {
        if (!selectedTemplate) return;

        const regex = /\{\{([^}]+)\}\}/g;
        const matches = Array.from(selectedTemplate.content.matchAll(regex)).map((m: any) => m[1]);
        const uniqueVars = Array.from(new Set(matches));

        const newVars: Record<string, string> = {};
        uniqueVars.forEach(v => {
            // Auto-fill known variables from customer
            if (selectedCustomer) {
                if (v === 'TEN_KHACH_HANG' || v === 'TEN_DOANH_NGHIEP') newVars[v] = selectedCustomer.name;
                else if (v === 'MA_SO_THUE') newVars[v] = selectedCustomer.taxCode || '';
                else if (v === 'DIA_CHI_KHACH_HANG' || v === 'DIA_CHI') newVars[v] = selectedCustomer.address || '';
                else if (v === 'EMAIL') newVars[v] = selectedCustomer.email || '';
                else if (v === 'SO_DIEN_THOAI' || v === 'SDT') newVars[v] = selectedCustomer.phone || '';
                else newVars[v] = variables[v] || '';
            } else {
                newVars[v] = variables[v] || '';
            }
        });
        setVariables(newVars);
    }, [selectedTemplate, selectedCustomer]);

    // Update preview
    useEffect(() => {
        if (!selectedTemplate) {
            setPreviewContent('');
            return;
        }
        let content = selectedTemplate.content;
        Object.keys(variables).forEach(key => {
            let val = variables[key] || `[${key}]`;

            // Format number with commas if it's a numeric money field
            const moneyKeys = ['TIEN', 'GIA', 'THUE', 'CHI_PHI', 'PHI', 'VND', 'AMOUNT', 'TOTAL'];
            const isMoneyField = moneyKeys.some(k => key.toUpperCase().includes(k));
            if (isMoneyField && val && !isNaN(Number(val)) && val.trim() !== '') {
                val = Number(val).toLocaleString('en-US');
            }

            // replace all instances
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
        });
        setPreviewContent(content);
    }, [variables, selectedTemplate]);

    const handleTotalsChange = (totals: { baseTotal: number, taxTotal: number, grandTotal: number }) => {
        setVariables(prev => {
            let updated = false;
            const next = { ...prev };
            const formatCurrency = (num: number) => num.toLocaleString('en-US');

            if (totals.grandTotal > 0 || totals.baseTotal > 0) {
                Object.keys(next).forEach(k => {
                    const kl = k.toLowerCase();
                    if (kl.includes('chua_thue') || kl.includes('truoc_thue')) {
                        if (next[k] !== formatCurrency(totals.baseTotal)) {
                            next[k] = formatCurrency(totals.baseTotal);
                            updated = true;
                        }
                    } else if (kl.includes('tien_thue') || kl.includes('thue_vat') || kl.includes('thue_8') || kl.includes('thue_10')) {
                        if (next[k] !== formatCurrency(totals.taxTotal)) {
                            next[k] = formatCurrency(totals.taxTotal);
                            updated = true;
                        }
                    } else if (kl.includes('sau_thue') || (kl.includes('tong_tien') && !kl.includes('bang_chu'))) {
                        if (next[k] !== formatCurrency(totals.grandTotal)) {
                            next[k] = formatCurrency(totals.grandTotal);
                            updated = true;
                        }
                    }
                });
            }
            return updated ? next : prev;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedTemplate) {
            alert('Vui lòng chọn Mẫu hợp đồng');
            return;
        }

        if (!selectedCustomer) {
            alert('Vui lòng chọn Khách hàng');
            return;
        }

        const finalTitle = customTitle.trim() || `Hợp đồng - ${selectedCustomer.name} - ${new Date().toLocaleDateString('vi-VN')}`;

        setIsSubmitting(true);
        try {
            const result = await createContract({
                title: finalTitle,
                content: previewContent || selectedTemplate.content,
                variables: JSON.stringify(variables),
                customerId: selectedCustomer.id,
                templateId: selectedTemplate.id,
                projectId: projectId.trim() ? projectId : undefined
            });
            router.push(`/contracts/${result.id}`);
        } catch (error: any) {
            console.error('Lỗi khi tạo hợp đồng:', error);
            alert(`Có lỗi xảy ra: ${error?.message || JSON.stringify(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors shadow-xs"
                    >
                        ←
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tạo Hợp Đồng Mới</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Lựa chọn mẫu, khách hàng và tự động tạo nội dung hợp đồng chuẩn hóa.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Form: Basic Info + Variables */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
                        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
                            <span className="w-6 h-6 rounded-md bg-emerald-50 text-[var(--primary)] font-bold text-xs flex items-center justify-center border border-emerald-200/60">
                                1
                            </span>
                            <h3 className="text-sm font-semibold text-slate-900">Thông tin cơ bản</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Tiêu Đề Hợp Đồng
                                </label>
                                <Input
                                    label=""
                                    value={customTitle}
                                    onChange={e => setCustomTitle(e.target.value)}
                                    placeholder="Nhập tên hợp đồng..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Chọn Mẫu Hợp Đồng <span className="text-rose-500">*</span>
                                </label>
                                <select 
                                    className="w-full h-[34px] text-xs font-medium px-2.5 py-1 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] text-slate-800 transition-all cursor-pointer"
                                    value={templateId} 
                                    onChange={e => setTemplateId(e.target.value)}
                                >
                                    <option value="">-- Chọn một mẫu hợp đồng --</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Chọn Khách Hàng <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    value={customerId}
                                    onChange={setCustomerId}
                                    options={customers.map(c => ({ value: c.id, label: c.name }))}
                                    placeholder="-- Chọn khách hàng --"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Dự Án Liên Kết <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                                </label>
                                <SearchableSelect
                                    value={projectId}
                                    onChange={setProjectId}
                                    options={projects?.map(p => ({ value: p.id, label: p.code ? `[${p.code}] ${p.name}` : p.name })) || []}
                                    placeholder="-- Chọn dự án --"
                                />
                            </div>
                        </div>
                    </div>

                    {selectedTemplate && (
                        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-md bg-emerald-50 text-[var(--primary)] font-bold text-xs flex items-center justify-center border border-emerald-200/60">
                                        2
                                    </span>
                                    <h3 className="text-sm font-semibold text-slate-900">Điền thông tin biến động</h3>
                                </div>
                                <span className="text-[11px] font-medium text-slate-400">
                                    {Object.keys(variables).length} trường dữ liệu
                                </span>
                            </div>

                            <div className="space-y-4">
                                {Object.keys(variables).map(key => {
                                    const isTableType = key.startsWith('TABLE_') || key.startsWith('BANG_');

                                    return (
                                        <div key={key} className="space-y-1.5">
                                            <label className={`block text-xs font-semibold ${isTableType ? 'text-[var(--primary)] flex items-center gap-1.5' : 'text-slate-700'}`}>
                                                {isTableType ? (
                                                    <>
                                                        <span className="text-sm">📊</span> Bảng tính: <span className="font-mono">{key}</span>
                                                    </>
                                                ) : (
                                                    <span className="font-mono text-slate-800">{key}</span>
                                                )}
                                            </label>
                                            {isTableType ? (
                                                <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-200">
                                                    <DynamicTableBuilder
                                                        value={variables[key]}
                                                        onChange={(html) => setVariables({ ...variables, [key]: html })}
                                                        onTotalsChange={handleTotalsChange}
                                                    />
                                                </div>
                                            ) : (
                                                <Input
                                                    label=""
                                                    value={variables[key]}
                                                    onChange={e => setVariables({ ...variables, [key]: e.target.value })}
                                                    placeholder={`Nhập ${key}`}
                                                />
                                            )}
                                        </div>
                                    );
                                })}

                                {Object.keys(variables).length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Mẫu này không có biến động nào cần điền.</p>
                                )}
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100">
                                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-2.5 shadow-sm">
                                    {isSubmitting ? 'Đang khởi tạo hợp đồng...' : 'Tạo Hợp Đồng'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Realistic A4 Preview */}
                <div className="lg:col-span-7 sticky top-20">
                    <div className="bg-slate-100/70 border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Xem trước Hợp đồng (A4)</h3>
                            </div>
                            <span className="text-[11px] font-medium text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                                Bản xem trước thời gian thực
                            </span>
                        </div>

                        {previewContent ? (
                            <div className="overflow-y-auto max-h-[calc(100vh-220px)] rounded-lg shadow-sm border border-slate-200 bg-white p-6 sm:p-10">
                                <div
                                    className="ql-editor"
                                    style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 1.7, fontSize: '14px', color: '#1e293b' }}
                                    dangerouslySetInnerHTML={{ __html: previewContent }}
                                />
                            </div>
                        ) : (
                            <div className="bg-white/80 border border-dashed border-slate-300 rounded-lg p-16 text-center">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3 text-xl">
                                    📄
                                </div>
                                <p className="text-xs font-semibold text-slate-600">Chưa chọn mẫu hợp đồng</p>
                                <p className="text-[11px] text-slate-400 mt-1">Vui lòng chọn mẫu hợp đồng ở khung bên trái để hiển thị xem trước.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
