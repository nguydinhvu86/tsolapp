const fs = require('fs');
const p = 'app/sales/invoices/[id]/SalesInvoiceDetailClient.tsx';
let txt = fs.readFileSync(p, 'utf8');

const startTag = '{/* Signatures Card */}';
const startIdx = txt.indexOf(startTag);
if (startIdx !== -1) {
    const nextStartTag = txt.indexOf(startTag, startIdx + startTag.length);
    let endIdx = -1;
    // We want to delete up to the second </div> after role="CUSTOMER"
    let roleCustIdx = txt.indexOf('role="CUSTOMER"', startIdx);
    if (roleCustIdx !== -1) {
        let firstDivClose = txt.indexOf('</div>', roleCustIdx);
        endIdx = txt.indexOf('</div>', firstDivClose + 5);
        
        let oldSigBlock = txt.substring(startIdx, endIdx + 6);
        
        const newSigBlock = `                    {/* Signatures Card */}
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

        txt = txt.replace(oldSigBlock, '');

        let col2Pos = txt.indexOf('{/* Column 2:');
        if (col2Pos !== -1) {
            let col1EndPos = txt.lastIndexOf('                </div>', col2Pos);
            txt = txt.substring(0, col1EndPos) + newSigBlock + '\n' + txt.substring(col1EndPos);
            fs.writeFileSync(p, txt, 'utf8');
            console.log('Fixed invoices');
        }
    }
}
