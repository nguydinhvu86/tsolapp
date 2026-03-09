import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/app/components/ui/PrintButton';
import { formatCurrencyInHtml } from '@/lib/utils';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { buildViewFilter } from '@/lib/permissions';
import { DocumentManagersPanel } from '@/app/components/shared/DocumentManagersPanel';
import { assignDispatchManagers, removeDispatchManager } from '../actions';

export default async function DispatchPrintView({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return notFound();
    const perms = (session.user.permissions as string[]) || [];
    const viewFilter = buildViewFilter(session.user.id, perms, 'DISPATCHES', 'creatorId', true);
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return notFound();

    const dispatch = await prisma.dispatch.findFirst({
        where: { id: params.id, ...viewFilter },
        include: { customer: true, managers: true }
    });

    if (!dispatch) return notFound();

    const tasks = await prisma.task.findMany({
        where: { dispatchId: params.id },
        include: { assignees: { include: { user: { select: { name: true, email: true } } } }, checklists: true },
        orderBy: { createdAt: 'desc' }
    });
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header Area (No Print) */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Link href="/dispatches" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}>
                            <ArrowLeft size={18} color="var(--text-main)" />
                        </Link>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                                {dispatch.title}
                            </h1>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Gửi đến: <strong>{dispatch.customer.name}</strong>
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <PrintButton />
                    </div>
                </div>

                {/* A4 Document Area & Task Panel */}
                <div className="dispatch-layout-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '1.5rem', alignItems: 'start' }}>
                    <div className="dispatch-layout-main" style={{ overflow: 'hidden' }}>
                        <div className="a4-document" style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm', padding: '15mm 20mm', margin: '0 auto', background: 'white', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', boxSizing: 'border-box' }}>
                            <style dangerouslySetInnerHTML={{
                                __html: `
                    @page { size: A4; margin: 0; }
                    @media print {
                    body { background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 13pt; }
                    .no-print { display: none !important; }
                    aside, header { display: none !important; }
                    .dispatch-layout-grid { display: block !important; }
                    .dispatch-layout-main { overflow: visible !important; width: 100% !important; max-width: 100% !important; }
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
                                dangerouslySetInnerHTML={{ __html: formatCurrencyInHtml(dispatch.content) }}
                            />
                        </div>
                    </div> {/* End Left Area */}

                    {/* Right Area: Task Panel */}
                    <div className="no-print" style={{ position: 'sticky', top: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <DocumentManagersPanel
                                documentId={params.id}
                                managers={dispatch.managers || []}
                                users={users || []}
                                currentUserRole={session?.user?.role || 'USER'}
                                onAssign={assignDispatchManagers}
                                onRemove={removeDispatchManager}
                            />
                            <TaskPanel initialTasks={tasks} users={users} entityType="DISPATCH" entityId={params.id} />
                        </div>
                    </div>
                </div> {/* End Grid */}
            </div> {/* End 1200px max-width */}
        </div> /* End min-height paddingBottom */
    );
}
