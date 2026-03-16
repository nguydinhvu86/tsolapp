const fs = require('fs');

const replacements = [
    { file: 'app/quotes/[id]/page.tsx', type: 'QUOTE' },
    { file: 'app/public/sales/invoice/[id]/page.tsx', type: 'SALES_INVOICE' },
    { file: 'app/public/sales/payments/[id]/page.tsx', type: 'SALES_PAYMENT' },
    { file: 'app/public/sales/order/[id]/page.tsx', type: 'SALES_ORDER' },
    { file: 'app/public/sales/estimate/[id]/page.tsx', type: 'SALES_ESTIMATE' },
    { file: 'app/public/purchasing/payments/[id]/page.tsx', type: 'PURCHASE_PAYMENT' },
    { file: 'app/public/purchasing/orders/[id]/page.tsx', type: 'PURCHASE_ORDER' },
    { file: 'app/public/purchasing/bills/[id]/page.tsx', type: 'PURCHASE_BILL' },
    { file: 'app/payment-requests/[id]/page.tsx', type: 'PAYMENT_REQUEST' },
    { file: 'app/handovers/[id]/page.tsx', type: 'HANDOVER' },
    { file: 'app/dispatches/[id]/page.tsx', type: 'DISPATCH' },
    { file: 'app/contract-appendices/[id]/page.tsx', type: 'CONTRACT_APPENDIX' }
];

const clientReplacements = [
    { file: 'app/print/sales/estimate/[id]/PrintSalesEstimateClient.tsx', type: 'SALES_ESTIMATE' },
    { file: 'app/print/sales/order/[id]/PrintSalesOrderClient.tsx', type: 'SALES_ORDER' },
    { file: 'app/print/sales/invoice/[id]/PrintSalesInvoiceClient.tsx', type: 'SALES_INVOICE' }
];

try {
    replacements.forEach(r => {
        let content = fs.readFileSync(r.file, 'utf8');
        content = content.replace(/<Watermark settings=\{settingsMap\} \/>/g, `<Watermark settings={settingsMap} documentType="${r.type}" />`);
        fs.writeFileSync(r.file, content);
    });

    clientReplacements.forEach(r => {
        let content = fs.readFileSync(r.file, 'utf8');
        content = content.replace(/<Watermark settings=\{settings\} \/>/g, `<Watermark settings={settings} documentType="${r.type}" />`);
        fs.writeFileSync(r.file, content);
    });
    console.log('Successfully injected documentType props to 15 files.');
} catch (e) {
    console.error(e);
}
