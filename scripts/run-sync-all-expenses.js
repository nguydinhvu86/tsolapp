const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== FULL SYNC: EXPENSES & PURCHASE PAYMENTS TO CASH BOOK ===');

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

  // 2. Sync Missing Purchase Payments
  const allPurchasePayments = await prisma.purchasePayment.findMany({
    orderBy: { date: 'asc' },
    include: {
      supplier: { select: { id: true, name: true, phone: true, address: true } },
      allocations: {
        include: { bill: { select: { code: true } } }
      }
    }
  });

  let allCashTx = await prisma.cashTransaction.findMany({
    select: { id: true, code: true, reason: true, notes: true, amount: true, transactionDate: true }
  });

  const missingPurchasePayments = allPurchasePayments.filter(pp => {
    return !allCashTx.some(c => 
      (c.reason && c.reason.includes(pp.code)) || 
      (c.notes && c.notes.includes(pp.code))
    );
  });

  console.log('\\nFound ' + missingPurchasePayments.length + ' missing Purchase Payments to sync...');

  for (const pp of missingPurchasePayments) {
    const txDate = pp.date ? new Date(pp.date) : new Date(pp.createdAt);
    const yy = String(txDate.getFullYear()).slice(-2);
    const mm = String(txDate.getMonth() + 1).padStart(2, '0');
    const ymPrefix = 'PC-' + yy + mm + '-';

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

    const billCodes = pp.allocations.map(a => a.bill?.code).filter(Boolean);
    const billDesc = billCodes.length > 0 ? ' (HĐ Mua: ' + billCodes.join(', ') + ')' : '';
    const acc = pp.paymentMethod === 'CASH' ? cashAcc : bankAcc;

    await prisma.cashTransaction.create({
      data: {
        code,
        type: 'PAYMENT',
        category: 'PURCHASE',
        transactionDate: txDate,
        amount: pp.amount,
        payerReceiver: pp.supplier?.name || 'Nhà cung cấp',
        phone: pp.supplier?.phone || null,
        address: pp.supplier?.address || null,
        reason: 'Chi thanh toán mua hàng theo phiếu ' + pp.code + billDesc,
        paymentMethod: pp.paymentMethod || 'BANK_TRANSFER',
        financeAccountId: acc?.id || null,
        supplierId: pp.supplierId,
        createdById: pp.creatorId || null,
        status: pp.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED',
        notes: pp.notes || 'Tự động đồng bộ từ Phiếu Chi Mua Hàng ' + pp.code,
        createdAt: pp.createdAt
      }
    });

    if (acc && pp.status !== 'CANCELLED') {
      await prisma.financeAccount.update({
        where: { id: acc.id },
        data: { currentBalance: { decrement: pp.amount } }
      });
    }

    console.log('Synced PurchasePayment ' + pp.code + ' -> CashTx ' + code + ' (' + pp.amount + ' VND, Date: ' + txDate.toISOString().slice(0, 10) + ')');
  }

  // 3. Sync Missing Expenses
  const allExpenses = await prisma.expense.findMany({
    orderBy: { date: 'asc' },
    include: {
      category: true,
      supplier: { select: { id: true, name: true, phone: true, address: true } },
      customer: { select: { id: true, name: true, phone: true, address: true } }
    }
  });

  allCashTx = await prisma.cashTransaction.findMany({
    select: { id: true, code: true, reason: true, notes: true, amount: true, transactionDate: true }
  });

  const missingExpenses = allExpenses.filter(exp => {
    return !allCashTx.some(c => 
      (c.reason && c.reason.includes(exp.code)) || 
      (c.notes && c.notes.includes(exp.code))
    );
  });

  console.log('\\nFound ' + missingExpenses.length + ' missing Expenses to sync...');

  for (const exp of missingExpenses) {
    const txDate = exp.date ? new Date(exp.date) : new Date(exp.createdAt);
    const yy = String(txDate.getFullYear()).slice(-2);
    const mm = String(txDate.getMonth() + 1).padStart(2, '0');
    const ymPrefix = 'PC-' + yy + mm + '-';

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
    const acc = exp.paymentMethod === 'CASH' ? cashAcc : bankAcc;

    await prisma.cashTransaction.create({
      data: {
        code,
        type: 'PAYMENT',
        category: 'OTHER_EXPENSE',
        transactionDate: txDate,
        amount: exp.amount,
        payerReceiver: exp.payee || exp.supplier?.name || exp.customer?.name || 'Người nhận',
        reason: 'Chi phí: ' + exp.description + ' (Mã: ' + exp.code + ')',
        paymentMethod: exp.paymentMethod || 'BANK_TRANSFER',
        financeAccountId: acc?.id || null,
        customerId: exp.customerId || null,
        supplierId: exp.supplierId || null,
        projectId: exp.projectId || null,
        createdById: exp.creatorId || null,
        status: exp.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED',
        notes: 'Tự động đồng bộ từ Khoản Chi Phí ' + exp.code,
        createdAt: exp.createdAt
      }
    });

    if (acc && exp.status !== 'CANCELLED') {
      await prisma.financeAccount.update({
        where: { id: acc.id },
        data: { currentBalance: { decrement: exp.amount } }
      });
    }

    console.log('Synced Expense ' + exp.code + ' -> CashTx ' + code + ' (' + exp.amount + ' VND, Date: ' + txDate.toISOString().slice(0, 10) + ')');
  }

  console.log('\\n=== SYNC COMPLETED SUCCESSFULLY ===');
}

main().finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
  const b64 = Buffer.from(scriptContent).toString('base64');
  const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && echo "${b64}" | base64 -d > scripts/sync-all-expenses-runner.js && node scripts/sync-all-expenses-runner.js`;
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
