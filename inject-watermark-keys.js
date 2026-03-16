const fs = require('fs');

const files = [
    'app/quotes/[id]/page.tsx',
    'app/public/sales/invoice/[id]/page.tsx',
    'app/public/sales/payments/[id]/page.tsx',
    'app/public/sales/order/[id]/page.tsx',
    'app/public/sales/estimate/[id]/page.tsx',
    'app/public/purchasing/payments/[id]/page.tsx',
    'app/public/purchasing/orders/[id]/page.tsx',
    'app/public/purchasing/bills/[id]/page.tsx',
    'app/payment-requests/[id]/page.tsx',
    'app/handovers/[id]/page.tsx',
    'app/dispatches/[id]/page.tsx',
    'app/contract-appendices/[id]/page.tsx',
    'app/print/sales/estimate/[id]/page.tsx',
    'app/print/sales/order/[id]/page.tsx',
    'app/print/sales/invoice/[id]/page.tsx'
];

try {
    files.forEach(f => {
        if (!fs.existsSync(f)) return;
        let content = fs.readFileSync(f, 'utf8');
        // Add WATERMARK_DOCUMENTS to the query
        content = content.replace(/'WATERMARK_SIZE'(?!, 'WATERMARK_DOCUMENTS')/g, "'WATERMARK_SIZE', 'WATERMARK_DOCUMENTS'");
        fs.writeFileSync(f, content);
    });
    console.log('Successfully injected WATERMARK_DOCUMENTS key to prisma queries.');
} catch (e) {
    console.error(e);
}
