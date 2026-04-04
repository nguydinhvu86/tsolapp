const fs = require('fs');
const p = 'app/sales/invoices/[id]/SalesInvoiceDetailClient.tsx';
let txt = fs.readFileSync(p, 'utf8');

// Add import if missing
if (!txt.includes("import { DocumentSignatureBlock }")) {
    txt = txt.replace(
        "import { EmailLogTable } from '@/app/components/ui/EmailLogTable';",
        "import { EmailLogTable } from '@/app/components/ui/EmailLogTable';\nimport { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';"
    );
}

// Check if we need to add the block
if (!txt.includes("role=\"CUSTOMER\"")) {
    const custBlockStr = `                            <DocumentSignatureBlock 
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
                            />`;
                            
    const compBlockStr = `                            <DocumentSignatureBlock 
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
                            />`;

    const newSigBlock = `                    {/* Signatures Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#10b981" /> Chữ ký xác nhận
                        </h2>
                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'nowrap', gap: '2rem' }}>
${compBlockStr}
${custBlockStr}
                        </div>
                    </div>`;

    // Wait, where to place it? 
    // "Column 1: Main Content" ends where "Column 2" begins.
    let col2Pos = txt.indexOf('{/* Column 2:');
    if (col2Pos !== -1) {
        let col1EndPos = txt.lastIndexOf('                </div>', col2Pos);
        if(col1EndPos !== -1) {
            txt = txt.substring(0, col1EndPos) + newSigBlock + '\n' + txt.substring(col1EndPos);
            fs.writeFileSync(p, txt, 'utf8');
            console.log('Inserted signature block for Invoices successfully');
        }
    }
}
