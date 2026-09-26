const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allSalesPayments = await prisma.salesPayment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
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

  const missing = [];
  for (const sp of allSalesPayments) {
    const matched = allCashTx.find(c => 
      (c.reason && c.reason.includes(sp.code)) || 
      (c.notes && c.notes.includes(sp.code))
    );
    if (!matched) {
      missing.push({
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

  console.log('Recent 20 Sales Payments - Missing from Cash Book:');
  console.log(JSON.stringify(missing, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
  const b64 = Buffer.from(scriptContent).toString('base64');
  const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && echo "${b64}" | base64 -d > scripts/check-recent-missing.js && node scripts/check-recent-missing.js`;
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
