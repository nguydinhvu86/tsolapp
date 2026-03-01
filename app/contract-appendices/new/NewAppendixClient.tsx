'use client'

import React, { useState, useEffect } from 'react';
import { ContractAppendixTemplate, Contract, Customer } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { TemplateVariablesGuide } from '@/app/components/ui/TemplateVariablesGuide';
import { useRouter } from 'next/navigation';
import { createContractAppendix } from './actions';
import { ArrowLeft, Save, Search, CheckCircle2 } from 'lucide-react';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import Link from 'next/link';

type ExtendedContract = Contract & { customer: Customer };

export function NewAppendixClient({
    contracts,
    templates,
    customers,
    preselectedContractId
}: {
    contracts: ExtendedContract[],
    templates: ContractAppendixTemplate[],
    customers: Customer[],
    preselectedContractId?: string
}) {
    const router = useRouter();
    const [title, setTitle] = useState('Phụ Lục Hợp Đồng');
    const [selectedContractId, setSelectedContractId] = useState<string>(preselectedContractId || '');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [content, setContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Derived state
    const selectedContract = contracts.find(c => c.id === selectedContractId);

    const handleGenerate = () => {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template || !selectedContract) return;

        const customer = customers.find(c => c.id === selectedContract.customerId);
        if (!customer) return;

        let newContent = template.content;
        const variables = {
            '{{TEN_KHACH_HANG}}': customer.name,
            '{{EMAIL_KHACH_HANG}}': customer.email || '',
            '{{SDT_KHACH_HANG}}': customer.phone || '',
            '{{DIA_CHI_KHACH_HANG}}': customer.address || '',
            '{{MST_KHACH_HANG}}': customer.taxCode || '',
            '{{NGAY_TAO}}': new Date().toLocaleDateString('vi-VN')
        };

        // Replace all variables
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(key, 'g');
            newContent = newContent.replace(regex, value);
        }

        setContent(newContent);
        setTitle(`Phụ Lục - ${template.name} - ${customer.name}`);
    };

    const handleSave = async () => {
        if (!selectedContractId || !selectedTemplateId || !content) {
            alert('Vui lòng điền đủ thông tin, chọn Hợp đồng chính và tạo nội dung phụ lục.');
            return;
        }

        setIsGenerating(true);
        try {
            await createContractAppendix({
                title,
                content,
                variables: JSON.stringify({ sourceContract: selectedContractId }),
                contractId: selectedContractId,
                templateId: selectedTemplateId
            });
            alert('Đã tạo phụ lục thành công!');
            router.push(`/contracts/${selectedContractId}`);
        } catch (e) {
            console.error(e);
            alert('Lỗi tạo phụ lục.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}>
                    <ArrowLeft size={18} color="var(--text-main)" />
                </button>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                        Tạo Phụ Lục Hợp Đồng
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Đính kèm một phụ lục mới vào hợp đồng đã ký hoặc đang dự thảo.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem' }}>
                {/* Left Column: Configuration */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Card style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>1. Chọn Hợp Đồng Chính</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <SearchableSelect
                                value={selectedContractId}
                                onChange={setSelectedContractId}
                                options={contracts.map(c => ({ value: c.id, label: `${c.title} (${c.customer.name})` }))}
                                placeholder="-- Chọn hợp đồng --"
                            />

                            {selectedContract && (
                                <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
                                        <CheckCircle2 size={14} color="var(--success)" /> Khách hàng liên quan
                                    </div>
                                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>{selectedContract.customer.name}</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>2. Cấu Hình Phụ Lục</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="flex flex-col gap-2">
                                <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Chọn Mẫu Phụ Lục</label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '8px',
                                        border: '1px solid var(--border)', background: 'var(--surface)',
                                        color: 'var(--text-main)', fontSize: '0.9375rem', outline: 'none'
                                    }}
                                >
                                    <option value="">-- Chọn mẫu phụ lục --</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="Tiêu đề phụ lục lưu trên hệ thống"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />

                            <Button
                                onClick={handleGenerate}
                                disabled={!selectedContractId || !selectedTemplateId}
                                className="w-full mt-2"
                            >
                                Soạn thảo từ Mẫu
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Editor */}
                <Card style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>3. Nội dung Phụ Lục Chi Tiết</h3>
                        <Button onClick={handleSave} disabled={isGenerating || !content}>
                            {isGenerating ? 'Đang lưu...' : <><Save size={18} /> Lưu Phụ Lục Kèm HĐ</>}
                        </Button>
                    </div>

                    <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                            placeholder="Chọn Hợp đồng & Mẫu rồi bấm 'Soạn thảo' để bắt đầu..."
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
}
