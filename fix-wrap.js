const fs = require('fs');
const paths = [
  'app/public/sales/estimate/[id]/page.tsx',
  'app/public/sales/order/[id]/page.tsx',
  'app/public/sales/invoice/[id]/page.tsx',
  'app/sales/estimates/[id]/SalesEstimateDetailClient.tsx',
  'app/sales/orders/[id]/SalesOrderDetailClient.tsx',
  'app/sales/invoices/[id]/SalesInvoiceDetailClient.tsx'
];

paths.forEach(p => {
  let txt = fs.readFileSync(p, 'utf8');
  txt = txt.replace(/flexWrap: 'wrap'/g, "flexWrap: 'nowrap'");
  fs.writeFileSync(p, txt, 'utf8');
  console.log('Updated', p);
});
