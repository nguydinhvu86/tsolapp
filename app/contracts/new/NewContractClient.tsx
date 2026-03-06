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

export function NewContractClient({ templates, customers, preselectedCustomerId }: { templates: ContractTemplate[], customers: Customer[], preselectedCustomerId?: string }) {
    const router = useRouter();
    const [templateId, setTemplateId] = useState('');
    const [customerId, setCustomerId] = useState(preselectedCustomerId || '');

    const [variables, setVariables] = useState<Record<string, string>>({});
    const [previewContent, setPreviewContent] = useState('');

    const selectedTemplate = templates.find(t => t.id === templateId);
    const selectedCustomer = customers.find(c => c.id === customerId);

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

        if (!selectedTemplate || !selectedCustomer) {
            alert('Vui lòng chọn đầy đủ Mẫu hợp đồng và Khách hàng');
            return;
        }

        try {
            const result = await createContract({
                title: `Hợp đồng - ${selectedCustomer.name} - ${new Date().toLocaleDateString('vi-VN')}`,
                content: previewContent,
                variables: JSON.stringify(variables),
                customerId: selectedCustomer.id,
                templateId: selectedTemplate.id
            });
            router.push('/contracts');
        } catch (error) {
            console.error('Lỗi khi tạo hợp đồng:', error);
            alert(`Có lỗi xảy ra: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
        }
    };

    return (
        <div className="flex" style={{ gap: '2rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Card>
                    <h3 style={{ marginBottom: '1rem' }}>1. Thông tin cơ bản</h3>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Chọn Mẫu Hợp Đồng</label>
                            <select className="input" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                                <option value="">-- Chọn một mẫu --</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>Chọn Khách Hàng</label>
                            <SearchableSelect
                                value={customerId}
                                onChange={setCustomerId}
                                options={customers.map(c => ({ value: c.id, label: c.name }))}
                                placeholder="-- Chọn khách hàng --"
                            />
                        </div>
                    </div>
                </Card>

                {selectedTemplate && (
                    <Card>
                        <h3 style={{ marginBottom: '1rem' }}>2. Điền thông tin biến động</h3>
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
                                            />
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
                                <p style={{ color: 'var(--text-muted)' }}>Mẫu này không có biến động nào cần điền.</p>
                            )}
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <Button onClick={handleSubmit} className="w-full">Tạo Hợp Đồng</Button>
                        </div>
                    </Card>
                )}
            </div>

            <div style={{ flex: 1.5 }}>
                <Card style={{ position: 'sticky', top: '80px', minHeight: '600px' }}>
                    <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Xem trước Hợp đồng</h3>
                    {previewContent ? (
                        <div
                            className="ql-editor"
                            style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 1.6, padding: '2rem', background: '#fff', border: '1px solid #ccc', borderRadius: '4px', minHeight: '800px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                            dangerouslySetInnerHTML={{ __html: previewContent }}
                        />
                    ) : (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '4rem' }}>
                            Vui lòng chọn mẫu để xem trước
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
