import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/app/components/ui/PrintButton';
import { formatCurrencyInHtml } from '@/lib/utils';
import { TaskPanel } from '@/app/components/tasks/TaskPanel';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { buildViewFilter } from '@/lib/permissions';

export default async function PaymentRequestPrintPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return notFound();
    const perms = (session.user.permissions as string[]) || [];
    const viewFilter = buildViewFilter(session.user.id, perms, 'PAYMENTS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return notFound();

    const paymentRequest = await prisma.paymentRequest.findFirst({
        where: { id: params.id, ...viewFilter },
        include: {
            customer: true,
            template: true,
        }
    });

    if (!paymentRequest) return notFound();

    const tasks = await prisma.task.findMany({
        where: { paymentReqId: params.id },
        include: { assignees: { include: { user: { select: { name: true, email: true } } } }, checklists: true },
        orderBy: { createdAt: 'desc' }
    });
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });

    return (
        <div className="payment-layout-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '1.5rem', alignItems: 'start', paddingBottom: '3rem' }}>
            {/* Left Area: Main Content */}
            <div className="payment-layout-main" style={{ overflow: 'hidden' }}>
                <div className="print-wrapper">
                    <div className="a4-document" style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm', padding: '15mm 20mm', margin: '0 auto', background: 'white', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', boxSizing: 'border-box' }}>
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
              .payment-layout-grid { display: block !important; }
              .payment-layout-main { overflow: visible !important; width: 100% !important; max-width: 100% !important; }
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
                        <div className="no-print" style={{ marginBottom: '20px', textAlign: 'right' }}>
                            <PrintButton />
                        </div>
                        <div
                            className="sun-editor-editable contract-print-content"
                            style={{ fontFamily: '"Times New Roman", Times, serif', lineHeight: 1.6, fontSize: '13pt', color: '#000', padding: 0, border: 'none' }}
                            dangerouslySetInnerHTML={{ __html: formatCurrencyInHtml(paymentRequest.content) }}
                        />
                    </div>
                </div>

            </div>

            {/* Right Area: Task Panel */}
            <div className="no-print" style={{ position: 'sticky', top: '1rem' }}>
                <TaskPanel initialTasks={tasks} users={users} entityType="PAYMENT_REQUEST" entityId={params.id} />
            </div>
        </div>
    );
}
