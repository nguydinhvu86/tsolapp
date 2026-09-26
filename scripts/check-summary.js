const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allExpenses = await prisma.expense.findMany({
    orderBy: { date: 'asc' },
    include: {
      category: true,
      supplier: { select: { id: true, name: true, phone: true, address: true } },
      customer: { select: { id: true, name: true, phone: true, address: true } }
    }
  });

  const allPurchasePayments = await prisma.purchasePayment.findMany({
    orderBy: { date: 'asc' },
    include: {
      supplier: { select: { id: true, name: true, phone: true, address: true } },
      allocations: {
        include: { bill: { select: { code: true } } }
      }
    }
  });

  const allCashTx = await prisma.cashTransaction.findMany({
    select: { id: true, code: true, reason: true, notes: true, amount: true, transactionDate: true }
  });

  const missingExpenses = allExpenses.filter(exp => {
    return !allCashTx.some(c => 
      (c.reason && c.reason.includes(exp.code)) || 
      (c.notes && c.notes.includes(exp.code))
    );
  });

  const missingPurchasePayments = allPurchasePayments.filter(pp => {
    return !allCashTx.some(c => 
      (c.reason && c.reason.includes(pp.code)) || 
      (c.notes && c.notes.includes(pp.code))
    );
  });

  console.log('--- SUMMARY ---');
  console.log('Total Expenses in system:', allExpenses.length);
  console.log('Missing Expenses to sync into Sổ Quỹ:', missingExpenses.length);
  console.log('Total Purchase Payments in system:', allPurchasePayments.length);
  console.log('Missing Purchase Payments to sync into Sổ Quỹ:', missingPurchasePayments.length);
  
  console.log('\\nSample Missing Expenses:');
  console.log(missingExpenses.slice(0, 5).map(e => ({ code: e.code, payee: e.payee, amount: e.amount, date: e.date, desc: e.description })));

  console.log('\\nSample Missing Purchase Payments:');
  console.log(missingPurchasePayments.slice(0, 5).map(p => ({ code: p.code, supplier: p.supplier?.name, amount: p.amount, date: p.date })));
}

main().finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
  const b64 = Buffer.from(scriptContent).toString('base64');
  const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && echo "${b64}" | base64 -d > scripts/check-summary-runner.js && node scripts/check-summary-runner.js`;
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
