'use client'

import React, { useState } from 'react';
import { Customer, DispatchTemplate } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { TemplateVariablesGuide } from '@/app/components/ui/TemplateVariablesGuide';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { createDispatch } from './actions';
import { ArrowLeft, Save, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NewDispatchClient({ templates, customers, preselectedCustomerId }: {
    templates: DispatchTemplate[],
    customers: Customer[],
    preselectedCustomerId?: string
}) {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<string>(preselectedCustomerId || '');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [content, setContent] = useState('');
    const [variables, setVariables] = useState<any>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleGenerate = () => {
        if (!selectedCustomer) {
            alert('Vui lòng chọn khách hàng!');
            return;
        }
        if (!selectedTemplate) {
            alert('Vui lòng chọn mẫu công văn!');
            return;
        }

        setIsGenerating(true);
        const template = templates.find(t => t.id === selectedTemplate);
        const customer = customers.find(c => c.id === selectedCustomer);

        if (template && customer) {
            // Auto fill title
            setTitle(`${template.name} - ${customer.name}`);

            let newContent = template.content;

            // Basic auto-mapping
            const vars = {
                '{{TEN_KHACH_HANG}}': customer.name,
                '{{DIA_CHI}}': customer.address || '...',
                '{{SO_DIEN_THOAI}}': customer.phone || '...',
                '{{EMAIL}}': customer.email || '...',
                '{{MA_SO_THUE}}': customer.taxCode || '...',
            };

            for (const [key, value] of Object.entries(vars)) {
                const regex = new RegExp(key, 'g');
                newContent = newContent.replace(regex, value);
            }

            setContent(newContent);
            setVariables(vars);
        }
        setIsGenerating(false);
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
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '2rem' }}>
                <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>Thông tin Công văn</h3>

                    <div className="flex flex-col gap-1">
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>1. Chọn Khách hàng *</label>
                        <SearchableSelect
                            value={selectedCustomer}
                            onChange={setSelectedCustomer}
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            placeholder="-- Chọn khách hàng --"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>2. Chọn Mẫu Công văn/Thông báo *</label>
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

                    <Button onClick={handleGenerate} disabled={isGenerating || !selectedCustomer || !selectedTemplate} className="w-full justify-center gap-2" style={{ marginTop: '0.5rem' }}>
                        {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        Tạo dự thảo
                    </Button>
                </Card>

                <Card>
                    <TemplateVariablesGuide />
                </Card>
            </div>

            <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Nội dung Chính Thức *</label>
                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                            placeholder="Nội dung công văn sẽ hiển thị ở đây sau khi chọn Mẫu và bấm 'Tạo dự thảo'..."
                        />
                    </div>
                </Card>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <Button variant="secondary" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft size={18} /> Quay lại
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !content.trim()} className="gap-2">
                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        Lưu Công Văn
                    </Button>
                </div>
            </div>
        </div>
    );
}
