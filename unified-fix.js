const fs = require('fs');
const files = [
  {p: 'app/sales/estimates/[id]/SalesEstimateDetailClient.tsx', entity: 'estimate'},
  {p: 'app/sales/orders/[id]/SalesOrderDetailClient.tsx', entity: 'order'},
  {p: 'app/sales/invoices/[id]/SalesInvoiceDetailClient.tsx', entity: 'invoice'}
];

files.forEach(({p, entity}) => {
  let txt = fs.readFileSync(p, 'utf8');
  
  let sigClusterRegex = /\{\/\* Signatures Card \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
  let match = txt.match(sigClusterRegex);
  if (!match) {
      // If it's a bit different...
      const altRegex = /<div style=\{\{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0'[\s\S]*?<\/div>[\s]*<\/div>[\s]*<\/div>/;
      match = txt.match(altRegex);
  }
  
  if (match) {
      let oldSigBlock = match[0];
      
      const compBlockStr = `                            <DocumentSignatureBlock 
                                entityType="${entity === 'estimate' ? 'SALES_ESTIMATE' : entity === 'order' ? 'SALES_ORDER' : 'SALES_INVOICE'}" 
                                entityId={${entity}.id} 
                                role="COMPANY" 
                                title="NGƯỜI LẬP ${entity === 'estimate' ? 'BÁO GIÁ' : entity === 'order' ? 'ĐƠN HÀNG' : 'HÓA ĐƠN'}" 
                                subtitle="(Ký xác nhận nội bộ)" 
                                canSign={true} 
                                initialSignature={${entity}.companySignature} 
                                initialSignedAt={${entity}.companySignedAt} 
                                signerName={${entity}.creator?.name} 
                                companySignerId={session?.user?.id}
                            />`;
                                
      const custBlockStr = `                            <DocumentSignatureBlock 
                                entityType="${entity === 'estimate' ? 'SALES_ESTIMATE' : entity === 'order' ? 'SALES_ORDER' : 'SALES_INVOICE'}" 
                                entityId={${entity}.id} 
                                role="CUSTOMER" 
                                title="ĐẠI DIỆN KHÁCH HÀNG" 
                                subtitle="(Khách hàng ký qua link public)" 
                                canSign={false} 
                                initialSignature={${entity}.customerSignature} 
                                initialSignedAt={${entity}.customerSignedAt}
                            metadata={{
                                ip: ${entity}.customerSignIP,
                                device: ${entity}.customerSignDevice,
                                location: ${entity}.customerSignLocation
                            }} 
                            />`;

      let newSigBlock = `                    {/* Signatures Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#10b981" /> Chữ ký xác nhận
                        </h2>
                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'nowrap', gap: '2rem' }}>
${compBlockStr}
${custBlockStr}
                        </div>
                    </div>`;

      txt = txt.replace(oldSigBlock, '');

      let col2Pos = txt.indexOf('{/* Column 2:');
      if (col2Pos !== -1) {
          let col1EndPos = txt.lastIndexOf('                </div>', col2Pos);
          if (col1EndPos !== -1) {
              txt = txt.substring(0, col1EndPos) + newSigBlock + '\n' + txt.substring(col1EndPos);
              fs.writeFileSync(p, txt, 'utf8');
              console.log('Fixed, moved, and updated', p);
          }
      }
  } else {
      console.log('Could not find signature block in', p);
  }
});
