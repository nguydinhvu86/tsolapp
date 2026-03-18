'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { ArrowLeft, CheckCircle, Trash2, Printer, Download, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { processTransaction, deleteTransaction } from '../../transaction-actions';
import { useSession } from 'next-auth/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { useTranslation } from '@/app/i18n/LanguageContext';

export default function TransactionDetailClient({ transaction }: { transaction: any }) {
    const router = useRouter();
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const { t } = useTranslation();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);

    const formatDate = (d: string | Date) => {
        return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'IN': return t('transactions.typeIn');
            case 'OUT': return t('transactions.typeOut');
            case 'TRANSFER': return t('transactions.typeTransfer');
            case 'ADJUSTMENT': return t('transactions.typeAdjustment');
            default: return type;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'COMPLETED': return t('transactions.statusCompleted');
            case 'DRAFT': return t('transactions.statusDraft');
            case 'CANCELLED': return t('transactions.statusCancelled');
            default: return status;
        }
    };

    const handleProcess = async () => {
        if (!userId) {
            alert(t('transactions.sessionExpired'));
            return;
        }
        if (confirm(t('transactions.approvePrompt').replace('{{code}}', transaction.code))) {
            try {
                setIsProcessing(true);
                await processTransaction(transaction.id, userId);
                alert(t('transactions.approveSuccess'));
                router.refresh();
            } catch (error: any) {
                alert(error.message || t('transactions.genericError'));
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleDelete = async () => {
        if (confirm(t('transactions.deletePrompt').replace('{{code}}', transaction.code))) {
            try {
                await deleteTransaction(transaction.id);
                router.push('/inventory/transactions');
            } catch (error: any) {
                alert(error.message || t('transactions.genericError'));
            }
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const wsData = transaction.items.map((item: any, idx: number) => ({
            [t('transactions.colIndex')]: idx + 1,
            [t('transactions.colSku')]: item.product?.sku,
            [t('transactions.colProductName')]: item.product?.name,
            [t('transactions.colUnit')]: item.product?.unit || t('transactions.unitDefault'),
            [t('transactions.colQuantity')]: item.quantity
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, t('transactions.exportSheetDetail'));
        XLSX.writeFile(wb, `Phieu_${transaction.code}.xlsx`);
    };

    const handleExportPDF = async () => {
        const element = document.getElementById('print-area');
        if (!element) return;
        try {
            setIsExportingPDF(true);
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Phieu_${transaction.code}.pdf`);
        } catch (error) {
            console.error(error);
            alert(t('transactions.pdfError'));
        } finally {
            setIsExportingPDF(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'space-between' }}>
                <Button type="button" variant="secondary" onClick={() => router.push('/inventory/transactions')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="no-print">
                    <ArrowLeft size={16} /> {t('transactions.btnBack')}
                </Button>

                <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
                    <Button type="button" variant="secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileSpreadsheet size={16} /> {t('transactions.btnExport')}
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleExportPDF} disabled={isExportingPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Download size={16} /> {isExportingPDF ? t('transactions.btnExportPdfLoading') : t('transactions.btnExportPdf')}
                    </Button>
                    <Button type="button" variant="secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Printer size={16} /> {t('transactions.btnPrint')}
                    </Button>

                    {transaction.status === 'DRAFT' && (
                        <>
                            <Button type="button" variant="secondary" onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                <Trash2 size={16} /> {t('transactions.btnDelete')}
                            </Button>
                            <Button type="button" onClick={handleProcess} disabled={isProcessing} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#16a34a', color: 'white' }}>
                                <CheckCircle size={16} /> {isProcessing ? t('transactions.btnApproving') : t('transactions.btnApprove')}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Card id="print-area" style={{ padding: '2rem' }} className="print-area">
                <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                        {t('transactions.printTitlePrefix')} {getTypeLabel(transaction.type)}
                    </h2>
                    <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{t('transactions.printCode')} {transaction.code}</p>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                        <span style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.75rem', borderRadius: '4px', fontWeight: 700,
                            backgroundColor: transaction.status === 'COMPLETED' ? '#dcfce7' : (transaction.status === 'DRAFT' ? '#f3f4f6' : '#fee2e2'),
                            color: transaction.status === 'COMPLETED' ? '#16a34a' : (transaction.status === 'DRAFT' ? '#4b5563' : '#ef4444')
                        }}>
                            {getStatusLabel(transaction.status)}
                        </span>
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>{t('transactions.printGeneralInfo')}</h3>
                        <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'var(--text-muted)', width: '120px' }}>{t('transactions.printDate')}</td>
                                    <td style={{ padding: '0.5rem 0' }}>{formatDate(transaction.date)}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'var(--text-muted)' }}>{t('transactions.printCreator')}</td>
                                    <td style={{ padding: '0.5rem 0' }}>{transaction.creator?.name || transaction.creator?.email || '-'}</td>
                                </tr>
                                {transaction.notes && (
                                    <tr>
                                        <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'var(--text-muted)', verticalAlign: 'top' }}>{t('transactions.printNotes')}</td>
                                        <td style={{ padding: '0.5rem 0', whiteSpace: 'pre-line' }}>{transaction.notes}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>{t('transactions.printWarehouseInfo')}</h3>
                        <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse' }}>
                            <tbody>
                                {(transaction.type === 'OUT' || transaction.type === 'TRANSFER' || transaction.type === 'ADJUSTMENT') && (
                                    <tr>
                                        <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'var(--text-muted)', width: '120px' }}>{t('transactions.printFromWarehouse')}</td>
                                        <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'var(--text-main)' }}>{transaction.fromWarehouse?.name || '-'}</td>
                                    </tr>
                                )}
                                {(transaction.type === 'IN' || transaction.type === 'TRANSFER') && (
                                    <tr>
                                        <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'var(--text-muted)' }}>{t('transactions.printToWarehouse')}</td>
                                        <td style={{ padding: '0.5rem 0', fontWeight: 600, color: 'var(--text-main)' }}>{transaction.toWarehouse?.name || '-'}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>{t('transactions.printItemsTitle')}</h3>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('transactions.colIndex')}</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('transactions.colSku')}</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>{t('transactions.colProductName')}</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>{t('transactions.colQuantity')}</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>{t('transactions.colUnit')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transaction.items.map((item: any, idx: number) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem 1rem' }}>{idx + 1}</td>
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{item.product?.sku}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{item.product?.name}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>{item.quantity}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{item.product?.unit || t('transactions.unitDefault')}</td>
                                </tr>
                            ))}
                            {transaction.items.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('transactions.printNoItems')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '4rem', textAlign: 'center', pageBreakInside: 'avoid' }}>
                    <div>
                        <p style={{ fontWeight: 700, marginBottom: '4rem' }}>{t('transactions.printSignCreator')}</p>
                        <p style={{ fontWeight: 600 }}>{transaction.creator?.name || transaction.creator?.email}</p>
                    </div>
                    <div>
                        <p style={{ fontWeight: 700, marginBottom: '4rem' }}>{t('transactions.printSignReceiver')}</p>
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('transactions.printSignPrompt')}</p>
                    </div>
                </div>
            </Card>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; }
                    .print-area { box-shadow: none !important; border: none !important; }
                    aside, header { display: none !important; }
                    main { padding: 0 !important; margin: 0 !important; }
                }
            ` }} />
        </div>
    );
}
