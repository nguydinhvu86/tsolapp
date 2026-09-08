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
import { StatusBadge } from '@/app/components/ui/StatusBadge';

export function ContractDetailClient({ contract, settings }: { contract: any, settings?: Record<string, string> }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'content' | 'appendices'>('content');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header Area (No Print) */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push('/contracts')} 
                        className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-xs cursor-pointer"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 m-0 tracking-tight">
                            {contract.title}
                        </h1>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">
                            {t('contractDetails.draftAt')} {formatDate(new Date(contract.createdAt))}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {activeTab === 'content' && <PrintButton />}
                    <Button 
                        onClick={() => router.push(`/contract-appendices/new?contractId=${contract.id}`)} 
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs h-[34px]"
                    >
                        <Plus size={14} /> {t('contractDetails.createAppendix')}
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs (No Print) */}
            <Card className="no-print p-0 overflow-hidden border-slate-200 shadow-xs">
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                    <button
                        onClick={() => setActiveTab('content')}
                        className={`flex items-center gap-2 px-5 py-3 border-none bg-transparent cursor-pointer text-xs sm:text-sm font-medium transition-all relative
                            ${activeTab === 'content' ? 'font-semibold text-emerald-700 border-b-2 border-emerald-600 bg-white' : 'text-slate-600 border-b-2 border-transparent hover:text-slate-900'}`}
                    >
                        <FileText size={15} /> {t('contractDetails.tabContent')}
                    </button>
                    <button
                        onClick={() => setActiveTab('appendices')}
                        className={`flex items-center gap-2 px-5 py-3 border-none bg-transparent cursor-pointer text-xs sm:text-sm font-medium transition-all relative
                            ${activeTab === 'appendices' ? 'font-semibold text-emerald-700 border-b-2 border-emerald-600 bg-white' : 'text-slate-600 border-b-2 border-transparent hover:text-slate-900'}`}
                    >
                        <FileText size={15} /> {t('contractDetails.tabAppendices')}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                            ${activeTab === 'appendices' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
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
                <Card className="no-print p-4 md:p-5 border-slate-200 shadow-xs">
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
                                <tr key={apx.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td style={{ fontWeight: 500, color: '#0f172a' }}>{apx.title}</td>
                                    <td>
                                        <StatusBadge status={apx.status} />
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }} suppressHydrationWarning>{formatDate(new Date(apx.createdAt))}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <Link href={`/contract-appendices/${apx.id}`} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-all inline-flex items-center justify-center border border-slate-200" title={t('contractDetails.viewAndPrint')}>
                                                <Eye size={15} />
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
