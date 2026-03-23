import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { formatCurrencyInHtml } from '@/lib/utils';
import { Watermark } from '@/app/components/ui/Watermark';
import { PrintButton } from '@/app/components/ui/PrintButton';

export async function generateMetadata({ params }: { params: { id: string } }) {
    const quote = await prisma.quote.findUnique({
        where: { id: params.id }
    });
    return { title: quote?.title || "Báo Giá" };
}

export default async function PublicQuotePage({ params }: { params: { id: string } }) {
    const quote = await prisma.quote.findUnique({
        where: { id: params.id },
        include: { customer: true }
    });

    if (!quote) return notFound();

    const settings = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    'COMPANY_NAME', 'COMPANY_FULL_NAME', 'COMPANY_ADDRESS', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_TAX', 'COMPANY_LOGO',
                    'WATERMARK_ENABLED', 'WATERMARK_TYPE', 'WATERMARK_TEXT', 'WATERMARK_IMAGE_URL', 'WATERMARK_OPACITY', 'WATERMARK_ROTATION', 'WATERMARK_COLOR', 'WATERMARK_SIZE', 'WATERMARK_DOCUMENTS'
                ]
            }
        }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Header / Actions - Hidden during print */}
            <div className="no-print" style={{ maxWidth: '210mm', margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>{quote.title}</h1>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>Gửi đến: <strong>{quote.customer.name}</strong></p>
                </div>
                <PrintButton />
            </div>

            {/* Document Content */}
            <div className="a4-document print-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '210mm', minHeight: '297mm', padding: '15mm 20mm', margin: '0 auto', background: 'white', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', boxSizing: 'border-box' }}>
                <Watermark settings={settingsMap} documentType="QUOTE" />
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @page { size: A4; margin: 0; }
                    @media print {
                        body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .no-print { display: none !important; }
                        .print-wrapper {
                            position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: auto !important;
                            margin: 0 !important; padding: 0 !important; box-shadow: none !important; background: white !important; z-index: 9999 !important;
                        }
                        .a4-document { width: 100% !important; max-width: none !important; min-height: auto !important; padding: 15mm 20mm !important; margin: 0 !important; box-shadow: none !important; border: none !important; overflow: visible !important; box-sizing: border-box !important; }
                    }
                    .sun-editor-editable table { margin-bottom: 20px; border-collapse: collapse; }
                    .sun-editor-editable p { page-break-inside: auto !important; }
                    .sun-editor-editable h1, .sun-editor-editable h2, .sun-editor-editable h3, .sun-editor-editable h4 { page-break-after: avoid !important; margin-top: 15px; margin-bottom: 10px; font-weight: bold !important; color: #000 !important; }
                    .contract-print-content strong, .contract-print-content b { font-weight: bold !important; color: #000 !important; }
                `}} />
                <div
                    className="sun-editor-editable contract-print-content"
                    style={{ position: 'relative', zIndex: 1, fontFamily: '"Times New Roman", Times, serif', lineHeight: 1.6, fontSize: '13pt', color: '#000', padding: 0, border: 'none' }}
                    dangerouslySetInnerHTML={{ __html: formatCurrencyInHtml(quote.content) }}
                />
            </div>
        </div>
    );
}
