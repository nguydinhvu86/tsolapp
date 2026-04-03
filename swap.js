const fs = require('fs');

const files = [
    'app/sales/estimates/[id]/SalesEstimateDetailClient.tsx',
    'app/sales/orders/[id]/SalesOrderDetailClient.tsx',
    'app/sales/invoices/[id]/SalesInvoiceDetailClient.tsx',
    'app/public/sales/estimate/[id]/page.tsx',
    'app/public/sales/order/[id]/page.tsx',
    'app/public/sales/invoice/[id]/page.tsx'
];

files.forEach(p => {
    if (!fs.existsSync(p)) return;
    let txt = fs.readFileSync(p, 'utf8');

    // Find the Chữ ký xác nhận section
    const startTag = 'Chữ ký xác nhận';
    const startIdx = txt.indexOf(startTag);
    if (startIdx === -1) return;

    // Find the enclosing <div style={{ display: 'flex' ... }}>
    const flexDivIdx = txt.indexOf('<div style={{ display: \'flex\', justifyContent: \'space-around\'', startIdx);
    if (flexDivIdx === -1) return;
    
    // We want to find the two <DocumentSignatureBlock ... /> within this flex div
    // We can assume the first one starts after flexDivIdx and ends before the second one.
    const firstBlockStart = txt.indexOf('<DocumentSignatureBlock', flexDivIdx);
    if (firstBlockStart === -1) return;
    const firstBlockEnd = txt.indexOf('/>', firstBlockStart) + 2;

    const secondBlockStart = txt.indexOf('<DocumentSignatureBlock', firstBlockEnd);
    if (secondBlockStart === -1) return;
    const secondBlockEnd = txt.indexOf('/>', secondBlockStart) + 2;

    const block1 = txt.substring(firstBlockStart, firstBlockEnd);
    const block2 = txt.substring(secondBlockStart, secondBlockEnd);
    
    const blockSeparator = txt.substring(firstBlockEnd, secondBlockStart);

    // Swap block1 and block2
    const filePre = txt.substring(0, firstBlockStart);
    const filePost = txt.substring(secondBlockEnd);

    const newTxt = filePre + block2 + blockSeparator + block1 + filePost;
    
    fs.writeFileSync(p, newTxt, 'utf8');
    console.log('Swapped in ' + p);
});
