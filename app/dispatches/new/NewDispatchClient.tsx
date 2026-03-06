'use client'

import React, { useState, useEffect } from 'react';
import { Customer, DispatchTemplate, Product } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { TemplateVariablesGuide } from '@/app/components/ui/TemplateVariablesGuide';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { createDispatch } from './actions';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DynamicTableBuilder } from '@/app/components/ui/DynamicTableBuilder';
import { Input } from '@/app/components/ui/Input';

export function NewDispatchClient({ templates, customers, products = [], preselectedCustomerId }: {
    templates: DispatchTemplate[],
    customers: Customer[],
    products?: Product[],
    preselectedCustomerId?: string
}) {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<string>(preselectedCustomerId || '');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [content, setContent] = useState('');
    const [variables, setVariables] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [previewContent, setPreviewContent] = useState('');

    const template = templates.find(t => t.id === selectedTemplate);
    const customer = customers.find(c => c.id === selectedCustomer);

    // Initial setup when template/customer change
    useEffect(() => {
        if (!template) {
            setPreviewContent('');
            setVariables({});
            return;
        }

        const regex = /\{\{([^}]+)\}\}/g;
        const matches = Array.from(template.content.matchAll(regex)).map((m: any) => m[1]);
        const uniqueVars = Array.from(new Set(matches));

        const newVars: Record<string, string> = {};
        uniqueVars.forEach(v => {
            if (customer) {
                if (v === 'TEN_KHACH_HANG' || v === 'TEN_DOANH_NGHIEP') newVars[v] = customer.name;
                else if (v === 'MA_SO_THUE') newVars[v] = customer.taxCode || '';
                else if (v === 'DIA_CHI_KHACH_HANG' || v === 'DIA_CHI') newVars[v] = customer.address || '';
                else if (v === 'EMAIL') newVars[v] = customer.email || '';
                else if (v === 'SO_DIEN_THOAI' || v === 'SDT') newVars[v] = customer.phone || '';
                else newVars[v] = variables[v] || '';
            } else {
                newVars[v] = variables[v] || '';
            }
        });
        setVariables(newVars);

        if (customer && !title) {
            setTitle(`${template.name} - ${customer.name}`);
        }
    }, [template, customer]);

    // Live update preview
    useEffect(() => {
        if (!template) {
            setPreviewContent('');
            return;
        }

        let currentContent = template.content;
        Object.keys(variables).forEach(key => {
            let val = variables[key] || `[${key}]`;

            // Format number with commas if it's a numeric money field
            const moneyKeys = ['TIEN', 'GIA', 'THUE', 'CHI_PHI', 'PHI', 'VND', 'AMOUNT', 'TOTAL'];
            const isMoneyField = moneyKeys.some(k => key.toUpperCase().includes(k));
            if (isMoneyField && val && !isNaN(Number(val)) && val.trim() !== '') {
                val = Number(val).toLocaleString('en-US');
            }

            currentContent = currentContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
        });
        setPreviewContent(currentContent);
        setContent(currentContent); // Sync to content for saving
    }, [variables, template]);

    const handleTotalsChange = (totals: { baseTotal: number, taxTotal: number, grandTotal: number }) => {
        setVariables((prev: any) => {
            let updated = false;
            const next = { ...prev };
            const formatCurrency = (num: number) => num.toLocaleString('en-US');

            if (next['_GRAND_TOTAL'] !== totals.grandTotal.toString()) {
                next['_GRAND_TOTAL'] = totals.grandTotal.toString();
                updated = true;
            }

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

    const handleSave = async () => {
        if (!title.trim() || !content.trim() || !selectedCustomer || !selectedTemplate) {
            alert('Vui lòng điền đầy đủ thông tin (Tiêu đề, Khách hàng, Mẫu, Nội dung).');
            return;
        }

        setIsSaving(true);
        try {
            await createDispatch({
                title,
                customerId: selectedCustomer,
                templateId: selectedTemplate,
                content,
                variables: JSON.stringify(variables)
            });
            // The action will auto-redirect on success
        } catch (error) {
            console.error(error);
            alert('Có lỗi xảy ra khi lưu công văn.');
            setIsSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem' }}>
                <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>1. Thông tin Công văn</h3>

                    <div className="flex flex-col gap-1">
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Chọn Khách hàng *</label>
                        <SearchableSelect
                            value={selectedCustomer}
                            onChange={(val) => {
                                setSelectedCustomer(val);
                                // Optional reset title if they change customer?
                            }}
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            placeholder="-- Chọn khách hàng --"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Chọn Mẫu Công văn/Thông báo *</label>
                        <select
                            value={selectedTemplate}
                            onChange={e => setSelectedTemplate(e.target.value)}
                            style={{ padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', outline: 'none' }}
                        >
                            <option value="">-- Chọn mẫu công văn --</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </Card>

                {template && (
                    <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ margin: '0', fontSize: '1.25rem' }}>2. Điền thông tin biến động</h3>
                        <div className="flex flex-col gap-4">
                            {Object.keys(variables).map(key => {
                                const isTableType = key.startsWith('TABLE_') || key.startsWith('BANG_');

                                return (
                                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontWeight: 600, fontSize: '0.875rem', color: isTableType ? 'var(--primary)' : 'inherit' }}>
                                            {isTableType ? `📊 Bảng tính: ${key}` : key}
                                        </label>
                                        {isTableType ? (
                                            <DynamicTableBuilder
                                                value={variables[key]}
                                                onChange={(html) => setVariables({ ...variables, [key]: html })}
                                                onTotalsChange={handleTotalsChange}
                                                products={products}
                                            />
                                        ) : (
                                            <Input
                                                label=""
                                                value={variables[key]}
                                                onChange={e => setVariables((prev: any) => ({ ...prev, [key]: e.target.value }))}
                                                placeholder={`Nhập ${key}`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                            {Object.keys(variables).length === 0 && (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Mẫu này không có biến động nào cần điền.</p>
                            )}
                        </div>
                    </Card>
                )}

                <Card>
                    <TemplateVariablesGuide />
                </Card>
            </div>

            <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Card style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '600px' }}>
                    <div className="flex flex-col gap-1">
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Tiêu đề Công Văn (Sẽ hiển thị trong danh sách) *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Nhập tiêu đề công văn..."
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem', outline: 'none', background: 'var(--background)' }}
                        />
                    </div>

                    <div className="flex flex-col gap-1" style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Xem Trước Hình Thức Công Văn</h3>
                        {previewContent ? (
                            <div
                                className="ql-editor sun-editor-editable bg-white border border-gray-200 rounded-md p-8 min-h-[600px] shadow-sm"
                                style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 1.6 }}
                                dangerouslySetInnerHTML={{ __html: previewContent }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 min-h-[300px]">
                                <span className="text-lg">Vui lòng Chọn Khách hàng & Mẫu công văn để xem trước nội dung.</span>
                            </div>
                        )}
                    </div>
                </Card>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <Button variant="secondary" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft size={18} /> Quay lại
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !content.trim() || !title.trim()} className="gap-2 px-8">
                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        Lưu Công Văn
                    </Button>
                </div>
            </div>
        </div>
    );
}
