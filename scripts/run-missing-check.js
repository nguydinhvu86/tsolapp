const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING ALL PAYMENTS & CASH TRANSACTIONS ===');
  
  const allSalesPayments = await prisma.salesPayment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true } },
      allocations: {
        include: { invoice: { select: { code: true } } }
      }
    }
  });
  
  const allCashTx = await prisma.cashTransaction.findMany({
    select: { id: true, code: true, reason: true, notes: true, amount: true, transactionDate: true }
  });
  
  console.log('Total Sales Payments:', allSalesPayments.length);
  console.log('Total Cash Transactions:', allCashTx.length);

  const missingSalesPayments = [];
  for (const sp of allSalesPayments) {
    // Check if a cashTx mentions this payment code in reason or notes
    const matched = allCashTx.find(c => 
      (c.reason && c.reason.includes(sp.code)) || 
      (c.notes && c.notes.includes(sp.code))
    );
    if (!matched) {
      missingSalesPayments.push({
        id: sp.id,
        code: sp.code,
        date: sp.date,
        createdAt: sp.createdAt,
        amount: sp.amount,
        customerName: sp.customer?.name,
        invoices: sp.allocations.map(a => a.invoice?.code).filter(Boolean)
      });
    }
  }

  console.log('\\nSales Payments WITHOUT CashTransaction (' + missingSalesPayments.length + '):');
  console.log(JSON.stringify(missingSalesPayments, null, 2));

  const allPurchasePayments = await prisma.purchasePayment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: { select: { name: true } },
      allocations: {
        include: { bill: { select: { code: true } } }
      }
    }
  });

  const missingPurchasePayments = [];
  for (const pp of allPurchasePayments) {
    const matched = allCashTx.find(c => 
      (c.reason && c.reason.includes(pp.code)) || 
      (c.notes && c.notes.includes(pp.code))
    );
    if (!matched) {
      missingPurchasePayments.push({
        id: pp.id,
        code: pp.code,
        date: pp.date,
        createdAt: pp.createdAt,
        amount: pp.amount,
        supplierName: pp.supplier?.name,
        bills: pp.allocations.map(a => a.bill?.code).filter(Boolean)
      });
    }
  }

  console.log('\\nPurchase Payments WITHOUT CashTransaction (' + missingPurchasePayments.length + '):');
  console.log(JSON.stringify(missingPurchasePayments, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
  const b64 = Buffer.from(scriptContent).toString('base64');
  const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && echo "${b64}" | base64 -d > scripts/check-missing-tx.js && node scripts/check-missing-tx.js`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', data => process.stdout.write(data.toString()));
    stream.stderr.on('data', data => process.stderr.write(data.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '124.158.9.5',
  port: 22,
  username: 'incall',
  password: 'P@ssw0rdVu'
});
