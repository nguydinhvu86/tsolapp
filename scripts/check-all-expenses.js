const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING ALL EXPENSES AND PURCHASE PAYMENTS ===');

  const allExpenses = await prisma.expense.findMany({
    orderBy: { date: 'asc' },
    include: {
      category: true,
      supplier: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } }
    }
  });
  console.log('Total Expenses (Chi phí):', allExpenses.length);

  const allPurchasePayments = await prisma.purchasePayment.findMany({
    orderBy: { date: 'asc' },
    include: {
      supplier: { select: { id: true, name: true } },
      allocations: {
        include: { bill: { select: { code: true } } }
      }
    }
  });
  console.log('Total Purchase Payments (Chi mua hàng):', allPurchasePayments.length);

  const allCashTx = await prisma.cashTransaction.findMany({
    select: { id: true, code: true, type: true, category: true, reason: true, notes: true, amount: true, transactionDate: true }
  });
  console.log('Total Cash Transactions in Cash Book:', allCashTx.length);

  const missingExpenses = allExpenses.filter(exp => {
    return !allCashTx.some(c => 
      (c.reason && c.reason.includes(exp.code)) || 
      (c.notes && c.notes.includes(exp.code))
    );
  });
  console.log('\\nMissing Expenses from Cash Book (' + missingExpenses.length + '):');
  console.log(JSON.stringify(missingExpenses.map(e => ({
    id: e.id,
    code: e.code,
    date: e.date,
    amount: e.amount,
    payee: e.payee,
    description: e.description,
    category: e.category?.name
  })), null, 2));

  const missingPurchasePayments = allPurchasePayments.filter(pp => {
    return !allCashTx.some(c => 
      (c.reason && c.reason.includes(pp.code)) || 
      (c.notes && c.notes.includes(pp.code))
    );
  });
  console.log('\\nMissing Purchase Payments from Cash Book (' + missingPurchasePayments.length + '):');
  console.log(JSON.stringify(missingPurchasePayments.map(p => ({
    id: p.id,
    code: p.code,
    date: p.date,
    amount: p.amount,
    supplier: p.supplier?.name,
    bills: p.allocations.map(a => a.bill?.code)
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
  const b64 = Buffer.from(scriptContent).toString('base64');
  const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && echo "${b64}" | base64 -d > scripts/check-all-expenses-runner.js && node scripts/check-all-expenses-runner.js`;
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
