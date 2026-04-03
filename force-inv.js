const fs = require('fs');
const p = 'app/sales/invoices/[id]/SalesInvoiceDetailClient.tsx';
let txt = fs.readFileSync(p, 'utf8');

if (!txt.includes('DocumentSignatureBlock')) {
    txt = txt.replace(
        "import { EmailLogTable } from '@/app/components/ui/EmailLogTable';",
        "import { EmailLogTable } from '@/app/components/ui/EmailLogTable';\nimport { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';"
    );
    
    const blockStr = `                    {/* Signatures Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#10b981" /> Chữ ký xác nhận
                        </h2>
                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'nowrap', gap: '2rem' }}>
                            <DocumentSignatureBlock 
                                entityType="SALES_INVOICE" 
                                entityId={invoice.id} 
                                role="COMPANY" 
                                title="NGƯỜI LẬP HÓA ĐƠN" 
                                subtitle="(Ký xác nhận nội bộ)" 
                                canSign={true} 
                                initialSignature={invoice.companySignature} 
                                initialSignedAt={invoice.companySignedAt} 
                                signerName={invoice.creator?.name} 
                                companySignerId={session?.user?.id}
                            />
                            <DocumentSignatureBlock 
                                entityType="SALES_INVOICE" 
                                entityId={invoice.id} 
                                role="CUSTOMER" 
                                title="ĐẠI DIỆN KHÁCH HÀNG" 
                                subtitle="(Khách hàng ký qua link public)" 
                                canSign={false} 
                                initialSignature={invoice.customerSignature} 
                                initialSignedAt={invoice.customerSignedAt}
                            metadata={{
                                ip: invoice.customerSignIP,
                                device: invoice.customerSignDevice,
                                location: invoice.customerSignLocation
                            }} 
                            />
                        </div>
                    </div>`;

    const targetStr = '                {/* Column 2:';
    if(txt.includes(targetStr)) {
        txt = txt.replace(targetStr, blockStr + '\\n\\n' + targetStr);
        fs.writeFileSync(p, txt, 'utf8');
        console.log('Forcibly injected signature block');
    }
}
