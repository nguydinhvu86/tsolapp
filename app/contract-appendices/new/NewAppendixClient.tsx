'use client'

import React, { useState, useEffect } from 'react';
import { ContractAppendixTemplate, Contract, Customer, Product } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';

import { useRouter } from 'next/navigation';
import { createContractAppendix } from './actions';
import { ArrowLeft, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { DynamicTableBuilder } from '@/app/components/ui/DynamicTableBuilder';

type ExtendedContract = Contract & { customer: Customer };

export function NewAppendixClient({
    contracts,
    templates,
    customers,
    products = [],
    preselectedContractId
}: {
    contracts: ExtendedContract[],
    templates: ContractAppendixTemplate[],
    customers: Customer[],
    products?: Product[],
    preselectedContractId?: string
}) {
    const router = useRouter();
    const [title, setTitle] = useState('Phụ Lục Hợp Đồng');
    const [selectedContractId, setSelectedContractId] = useState<string>(preselectedContractId || '');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [content, setContent] = useState('');
    const [variables, setVariables] = useState<any>({});
    const [previewContent, setPreviewContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Derived state
    const selectedContract = contracts.find(c => c.id === selectedContractId);
    const template = templates.find(t => t.id === selectedTemplateId);
    const customer = customers.find(c => c.id === selectedContract?.customerId);

    // Initial setup when template/contract change
    useEffect(() => {
        if (!template || !selectedContract || !customer) {
            setPreviewContent('');
            setVariables({});
            return;
        }

        const regex = /\{\{([^}]+)\}\}/g;
        const matches = Array.from(template.content.matchAll(regex)).map((m: any) => m[1]);
        const uniqueVars = Array.from(new Set(matches));

        const newVars: Record<string, string> = {};
        uniqueVars.forEach(v => {
            if (v === 'TEN_KHACH_HANG' || v === 'TEN_DOANH_NGHIEP') newVars[v] = customer.name;
            else if (v === 'MA_SO_THUE') newVars[v] = customer.taxCode || '';
            else if (v === 'DIA_CHI_KHACH_HANG' || v === 'DIA_CHI') newVars[v] = customer.address || '';
            else if (v === 'EMAIL_KHACH_HANG' || v === 'EMAIL') newVars[v] = customer.email || '';
            else if (v === 'SDT_KHACH_HANG' || v === 'SO_DIEN_THOAI' || v === 'SDT') newVars[v] = customer.phone || '';
            else if (v === 'NGAY_TAO') newVars[v] = new Date().toLocaleDateString('vi-VN');
            else newVars[v] = variables[v] || '';
        });
        setVariables(newVars);

        // Only update title if it's the default or generic
        if (title === 'Phụ Lục Hợp Đồng' || title.startsWith('Phụ Lục -')) {
            setTitle(`Phụ Lục - ${template.name} - ${customer.name}`);
        }
    }, [template, selectedContract, customer]);

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
        if (!selectedContractId || !selectedTemplateId || !content) {
            alert('Vui lòng điền đủ thông tin, chọn Hợp đồng chính và kiểm tra nội dung phụ lục.');
            return;
        }

        setIsSaving(true);
        try {
            await createContractAppendix({
                title,
                content,
                variables: JSON.stringify(variables),
                contractId: selectedContractId,
                templateId: selectedTemplateId
            });
            alert('Đã tạo phụ lục thành công!');
            router.push(`/contracts/${selectedContractId}`);
        } catch (e) {
            console.error(e);
            alert('Lỗi tạo phụ lục.');
            setIsSaving(false);
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

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem' }}>
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
                        </div>
                    </Card>

                    {template && (
                        <Card style={{ padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>3. Điền thông tin biến động</h3>
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

                </div>

                {/* Right Column: Editor */}
                <div style={{ flex: '2 1 600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Card style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>4. Nội dung Phụ Lục Chi Tiết</h3>
                            <Button onClick={handleSave} disabled={isSaving || !content}>
                                {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                Lưu Phụ Lục Kèm HĐ
                            </Button>
                        </div>

                        <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="Nội dung phụ lục sẽ hiển thị ở đây sau khi bạn chọn Hợp đồng và Mẫu..."
                            />
                        </div>
                    </Card>


                </div>
            </div>
        </div>
    );
}
