const fs = require('fs');
const files = [
  'app/public/sales/estimate/[id]/page.tsx',
  'app/public/sales/order/[id]/page.tsx',
  'app/public/sales/invoice/[id]/page.tsx',
  'app/sales/estimates/[id]/SalesEstimateDetailClient.tsx',
  'app/sales/orders/[id]/SalesOrderDetailClient.tsx',
  'app/sales/invoices/[id]/SalesInvoiceDetailClient.tsx'
];

files.forEach((p) => {
  let txt = fs.readFileSync(p, 'utf8');
  
  const blockRegex = /<DocumentSignatureBlock[\s\S]*?\/>/g;
  const blocks = txt.match(blockRegex) || [];
  
  if (blocks.length > 0) {
      let custBlock = blocks.find(b => b.includes('role="CUSTOMER"'));
      let compBlock = blocks.find(b => b.includes('role="COMPANY"'));
      
      if (custBlock && compBlock) {
          const firstBlockIdx = txt.indexOf(blocks[0]);
          // Find the end index of the very last block
          let lastBlock = blocks[blocks.length - 1];
          let lastBlockIdx = txt.lastIndexOf(lastBlock);
          let lastBlockEndIdx = lastBlockIdx + lastBlock.length;
          
          let indents = txt.substring(0, firstBlockIdx).split('\n').pop() || '';
          
          const newBlockHTML = compBlock + '\n' + indents + custBlock;
          
          txt = txt.substring(0, firstBlockIdx) + newBlockHTML + txt.substring(lastBlockEndIdx);
          fs.writeFileSync(p, txt, 'utf8');
          console.log('Fixed:', p);
      }
  }
});
