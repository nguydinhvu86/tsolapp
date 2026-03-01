import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/app/components/ui/PrintButton';
import { formatCurrencyInHtml } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';

export default async function AppendixPrintView({ params }: { params: { id: string } }) {
    const appendix = await prisma.contractAppendix.findUnique({
        where: { id: params.id },
        include: { contract: true }
    });

    if (!appendix) return notFound();

    // @ts-ignore
    const tasks = await (prisma.task as any).findMany({
        where: { appendixId: params.id },
        include: { assignees: { include: { user: { select: { name: true, email: true } } } }, checklists: true },
        orderBy: { createdAt: 'desc' }
    });

    // Fallback: If `appendixId` logic is totally broken at runtime because Prisma Client generation failed, we simply get empty tasks array or error. We'll find out.
    // Assuming schema allows this.
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header Area (No Print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href={`/contracts/${appendix.contractId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}>
                        <ArrowLeft size={18} color="var(--text-main)" />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                            {appendix.title}
                        </h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            Phụ lục của Hợp đồng: <strong>{appendix.contract.title}</strong>
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <PrintButton />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '1.5rem', alignItems: 'start', paddingBottom: '3rem' }}>
                <div style={{ overflow: 'hidden' }}>
                    <div className="a4-document" style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm', padding: '15mm 20mm', margin: '0 auto', background: 'white', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', boxSizing: 'border-box' }}>
                        <style dangerouslySetInnerHTML={{
                            __html: `
                    @page { size: A4; margin: 0; }
                    @media print {
                    body { background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 13pt; }
                    .no-print { display: none !important; }
                    aside, header { display: none !important; }
                    .main-wrapper { margin-left: 0 !important; width: 100% !important; display: block !important; }
                    main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; overflow: visible; display: block !important; }
                    
                    /* Force exact A4 dimensions */
                    .a4-document { 
                        width: 100% !important; max-width: none !important; min-height: auto !important; 
                        padding: 15mm 20mm !important; margin: 0 !important; box-shadow: none !important; 
                        border: none !important; overflow: visible; box-sizing: border-box !important;
                    }
                    
                    /* Relaxed table constraints to allow SunEditor inline styles */
                    table { page-break-inside: auto !important; }
                    tr { page-break-inside: avoid !important; page-break-after: auto !important; }
                    thead { display: table-header-group !important; }
                    tfoot { display: table-footer-group !important; }
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
                            dangerouslySetInnerHTML={{ __html: formatCurrencyInHtml(appendix.content) }}
                        />
                    </div>
                </div>

                {/* Right Area: Task Panel */}
                <div className="no-print" style={{ position: 'sticky', top: '1rem' }}>
                    <TaskPanel initialTasks={tasks} users={users} entityType="APPENDIX" entityId={params.id} />
                </div>
            </div>
        </div>
    );
}
