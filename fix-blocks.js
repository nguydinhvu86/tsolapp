const fs = require('fs');
const files = [
  {p: 'app/public/sales/estimate/[id]/page.tsx', entity: 'estimate'},
  {p: 'app/public/sales/order/[id]/page.tsx', entity: 'order'},
  {p: 'app/public/sales/invoice/[id]/page.tsx', entity: 'invoice'},
  {p: 'app/sales/estimates/[id]/SalesEstimateDetailClient.tsx', entity: 'estimate'},
  {p: 'app/sales/orders/[id]/SalesOrderDetailClient.tsx', entity: 'order'},
  {p: 'app/sales/invoices/[id]/SalesInvoiceDetailClient.tsx', entity: 'invoice'}
];

files.forEach(({p, entity}) => {
  let txt = fs.readFileSync(p, 'utf8');

  // Step 1: Fix the broken regex syntax
  txt = txt.replace(/\.customerSignedAt/g, `${entity}.customerSignedAt`);
  txt = txt.replace(/\.customerSignIP/g, `${entity}.customerSignIP`);
  txt = txt.replace(/\.customerSignDevice/g, `${entity}.customerSignDevice`);
  txt = txt.replace(/\.customerSignLocation/g, `${entity}.customerSignLocation`);
  
  // Step 2: Swap the DocumentSignatureBlock elements
  // The first block is CUSTOMER, second is COMPANY. 
  // We can just find the indexes of `<DocumentSignatureBlock` where role="CUSTOMER" and role="COMPANY".
  
  // However, it's easier to swap them using regex if they are consistently nested.
  // Because they are within `<div className="no-break"` or `<div style={{ display: 'flex' ...}}>`
  
  const customerRegex = /<DocumentSignatureBlock[\s\S]*?role="CUSTOMER"[\s\S]*?\/>/g;
  const companyRegex = /<DocumentSignatureBlock[\s\S]*?role="COMPANY"[\s\S]*?\/>/g;
  
  const custMatch = txt.match(customerRegex);
  const compMatch = txt.match(companyRegex);
  
  if (custMatch && compMatch) {
    const custBlock = custMatch[0];
    const compBlock = compMatch[0];
    
    // We want COMPANY block to be first.
    // If we replace them in place:
    // Actually, let's just replace the customer block with a temporary placeholder
    const temp = '___TEMP_SWAP_PLACEHOLDER___';
    txt = txt.replace(custBlock, temp);
    txt = txt.replace(compBlock, custBlock);
    txt = txt.replace(temp, compBlock);
  }

  fs.writeFileSync(p, txt, 'utf8');
});

console.log('Fixed syntax and swapped layout');
