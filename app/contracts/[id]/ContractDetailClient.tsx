'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { PrintButton } from '@/app/components/ui/PrintButton';
import { formatCurrencyInHtml } from '@/lib/utils';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { FileText, Plus, Eye, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/app/i18n/LanguageContext';

import { Watermark } from '@/app/components/ui/Watermark';

export function ContractDetailClient({ contract, settings }: { contract: any, settings?: Record<string, string> }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'content' | 'appendices'>('content');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header Area (No Print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => router.push('/contracts')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}>
                        <ArrowLeft size={18} color="var(--text-main)" />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                            {contract.title}
                        </h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {t('contractDetails.draftAt')} {formatDate(new Date(contract.createdAt))}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {activeTab === 'content' && <PrintButton />}
                    <Button onClick={() => router.push(`/contract-appendices/new?contractId=${contract.id}`)} className="gap-2" style={{ background: 'var(--success)' }}>
                        <Plus size={18} /> {t('contractDetails.createAppendix')}
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs (No Print) */}
            <Card className="no-print" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#fafafa' }}>
                    <button
                        onClick={() => setActiveTab('content')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '1rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
                            borderBottom: activeTab === 'content' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'content' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'content' ? 600 : 500, fontSize: '0.9375rem', outline: 'none'
                        }}
                    >
                        <FileText size={18} /> {t('contractDetails.tabContent')}
                    </button>
                    <button
                        onClick={() => setActiveTab('appendices')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '1rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
                            borderBottom: activeTab === 'appendices' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === 'appendices' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'appendices' ? 600 : 500, fontSize: '0.9375rem', outline: 'none'
                        }}
                    >
                        <FileText size={18} /> {t('contractDetails.tabAppendices')}
                        <span style={{
                            background: activeTab === 'appendices' ? 'rgba(79, 70, 229, 0.1)' : 'var(--border)',
                            color: activeTab === 'appendices' ? 'var(--primary)' : 'var(--text-main)',
                            padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700
                        }}>
                            {contract.appendices.length}
                        </span>
                    </button>
                </div>
            </Card>

            {/* Tab: Content (Printable Area) */}
            {activeTab === 'content' && (
                <div className="print-wrapper">
                    <div className="a4-document" style={{ position: 'relative', width: '100%', maxWidth: '210mm', minHeight: '297mm', padding: '15mm 20mm', margin: '0 auto', background: 'white', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', boxSizing: 'border-box' }}>
                        <Watermark settings={settings} documentType="CONTRACT" />
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            @page { size: A4; margin: 0; }
                            @media print {
                              html, body { 
                                display: block !important; 
                                background: white !important; 
                                margin: 0; 
                                padding: 0; 
                                -webkit-print-color-adjust: exact; 
                                print-color-adjust: exact; 
                                font-size: 13pt; 
                              }
                              .no-print { display: none !important; }
                              aside, header, nav, footer { display: none !important; }
                              .contract-layout-grid { display: block !important; }
                              .contract-layout-main { overflow: visible !important; width: 100% !important; max-width: 100% !important; }
                              .main-wrapper { margin-left: 0 !important; width: 100% !important; display: block !important; }
                              main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; overflow: visible !important; display: block !important; }
                              
                              .print-wrapper {
                                position: absolute !important;
                                top: 0 !important;
                                left: 0 !important;
                                width: 100% !important;
                                height: auto !important;
                                overflow: visible !important;
                                display: block !important;
                                background: white !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                z-index: 9999 !important;
                              }

                              /* Force exact A4 dimensions */
                              .a4-document { 
                                  width: 100% !important; max-width: none !important; min-height: auto !important; 
                                  padding: 15mm 20mm !important; margin: 0 !important; box-shadow: none !important; 
                                  border: none !important; overflow: visible !important; box-sizing: border-box !important;
                                  background: white !important;
                              }
                              
                              /* Relaxed table constraints to allow SunEditor inline styles */
                              table { page-break-inside: auto !important; border-collapse: collapse; }
                              tr { page-break-inside: auto !important; page-break-after: auto !important; }
                              td, th { page-break-inside: auto !important; }
                              thead { display: table-header-group !important; }
                              tfoot { display: table-row-group !important; }
                            }
                            
                            /* SunEditor Output Base Overrides */
                            .sun-editor-editable table { margin-bottom: 20px; }
                            .sun-editor-editable p { page-break-inside: auto !important; }
                            .sun-editor-editable h1, .sun-editor-editable h2, .sun-editor-editable h3, .sun-editor-editable h4 { 
                                page-break-after: avoid !important; margin-top: 15px; margin-bottom: 10px; font-weight: bold !important; color: #000 !important; 
                            }
                            .contract-print-content strong, .contract-print-content b { font-weight: bold !important; color: #000 !important; }
                        `}} />
                        <div
                            className="sun-editor-editable contract-print-content"
                            style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 1.6, fontSize: '13pt', color: '#000', padding: 0, border: 'none' }}
                            dangerouslySetInnerHTML={{ __html: formatCurrencyInHtml(contract.content) }}
                        />
                    </div>
                </div>
            )}

            {/* Tab: Appendices (No Print, Management Interface) */}
            {activeTab === 'appendices' && (
                <Card className="no-print" style={{ padding: '1.5rem' }}>
                    <Table>
                        <thead>
                            <tr>
                                <th>{t('contractDetails.apxTitle')}</th>
                                <th>{t('contractDetails.apxStatus')}</th>
                                <th>{t('contractDetails.apxCreatedAt')}</th>
                                <th style={{ width: '100px', textAlign: 'right' }}>{t('contractDetails.apxActions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contract.appendices.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                        {t('contractDetails.noAppendices')}
                                    </td>
                                </tr>
                            ) : contract.appendices.map((apx: any) => (
                                <tr key={apx.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{apx.title}</td>
                                    <td>
                                        <span style={{
                                            backgroundColor: '#f1f5f9', color: '#64748b',
                                            padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600
                                        }}>
                                            {apx.status}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }} suppressHydrationWarning>{formatDate(new Date(apx.createdAt))}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <Link href={`/contract-appendices/${apx.id}`} style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', transition: 'all 0.2s'
                                            }} title={t('contractDetails.viewAndPrint')}>
                                                <Eye size={16} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
