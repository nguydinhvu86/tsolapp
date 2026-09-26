const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== SYNCING MISSING PAYMENTS TO CASH TRANSACTIONS ===');
  
  // 1. Get default bank and cash accounts
  const bankAcc = await prisma.financeAccount.findFirst({
    where: { isActive: true, type: 'BANK' },
    orderBy: { isDefault: 'desc' }
  });
  const cashAcc = await prisma.financeAccount.findFirst({
    where: { isActive: true, type: 'CASH' },
    orderBy: { isDefault: 'desc' }
  });
  console.log('Default Bank Account:', bankAcc?.name, bankAcc?.id);
  console.log('Default Cash Account:', cashAcc?.name, cashAcc?.id);

  // 2. Find all sales payments
  const allSalesPayments = await prisma.salesPayment.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      customer: { select: { id: true, name: true, phone: true, address: true } },
      allocations: {
        include: { invoice: { select: { code: true } } }
      }
    }
  });

  const allCashTx = await prisma.cashTransaction.findMany({
    select: { id: true, code: true, reason: true, notes: true, amount: true, transactionDate: true }
  });

  const missingSalesPayments = allSalesPayments.filter(sp => {
    return !allCashTx.some(c => 
      (c.reason && c.reason.includes(sp.code)) || 
      (c.notes && c.notes.includes(sp.code))
    );
  });

  console.log('Found ' + missingSalesPayments.length + ' missing Sales Payments to sync.');

  for (const sp of missingSalesPayments) {
    const txDate = sp.date ? new Date(sp.date) : new Date(sp.createdAt);
    const yy = String(txDate.getFullYear()).slice(-2);
    const mm = String(txDate.getMonth() + 1).padStart(2, '0');
    const ymPrefix = 'PT-' + yy + mm + '-';

    const lastTx = await prisma.cashTransaction.findFirst({
      where: { code: { startsWith: ymPrefix } },
      orderBy: { code: 'desc' },
      select: { code: true }
    });

    let seq = 1;
    if (lastTx && lastTx.code) {
      const parts = lastTx.code.split('-');
      if (parts.length === 3) {
        seq = parseInt(parts[2], 10) + 1;
      }
    }
    const code = ymPrefix + String(seq).padStart(4, '0');

    const invCodes = sp.allocations.map(a => a.invoice?.code).filter(Boolean);
    const invoiceDesc = invCodes.length > 0 ? ' (HĐ: ' + invCodes.join(', ') + ')' : '';
    const acc = sp.paymentMethod === 'CASH' ? cashAcc : bankAcc;

    const created = await prisma.cashTransaction.create({
      data: {
        code,
        type: 'RECEIPT',
        category: 'SALES',
        transactionDate: txDate,
        amount: sp.amount,
        payerReceiver: sp.customer?.name || 'Khách hàng',
        phone: sp.customer?.phone || null,
        address: sp.customer?.address || null,
        reason: 'Thu tiền bán hàng theo phiếu ' + sp.code + invoiceDesc,
        paymentMethod: sp.paymentMethod || 'BANK_TRANSFER',
        financeAccountId: acc?.id || null,
        customerId: sp.customerId,
        createdById: sp.creatorId || null,
        status: 'COMPLETED',
        notes: sp.notes || 'Tự động đồng bộ từ Phiếu Thu ' + sp.code,
        createdAt: sp.createdAt
      }
    });

    if (acc) {
      await prisma.financeAccount.update({
        where: { id: acc.id },
        data: { currentBalance: { increment: sp.amount } }
      });
    }

    console.log('Synced SalesPayment ' + sp.code + ' -> CashTx ' + code + ' (' + sp.amount + ' VND, Date: ' + txDate.toISOString().slice(0, 10) + ')');
  }

  console.log('\\n=== FINAL CHECK: LATEST 10 CASH TRANSACTIONS ===');
  const finalCash = await prisma.cashTransaction.findMany({
    take: 10,
    orderBy: { transactionDate: 'desc' },
    select: {
      code: true,
      type: true,
      transactionDate: true,
      amount: true,
      payerReceiver: true,
      reason: true
    }
  });
  console.log(JSON.stringify(finalCash, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
  const b64 = Buffer.from(scriptContent).toString('base64');
  const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && echo "${b64}" | base64 -d > scripts/sync-missing-tx-runner.js && node scripts/sync-missing-tx-runner.js`;
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
