const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log('--- SERVER CHECK ---');
  console.log('Current server time:', now.toISOString(), 'Local:', now.toString());

  // Check start of today (UTC and local VN time)
  const todayVN = new Date('2026-09-22T00:00:00+07:00');
  const todayUTC = new Date('2026-09-22T00:00:00Z');

  console.log('\n--- CASH TRANSACTIONS (LATEST 10) ---');
  const latestCash = await prisma.cashTransaction.findMany({
    take: 10,
    orderBy: { transactionDate: 'desc' },
    select: {
      code: true,
      type: true,
      transactionDate: true,
      amount: true,
      reason: true,
      partner: true,
      sourceType: true,
      sourceId: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(latestCash, null, 2));

  console.log('\n--- SALES PAYMENTS (LATEST 5) ---');
  const latestSalesPayments = await prisma.salesPayment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      code: true,
      amount: true,
      paymentDate: true,
      paymentMethod: true,
      invoiceId: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(latestSalesPayments, null, 2));

  console.log('\n--- PURCHASE PAYMENTS (LATEST 5) ---');
  const latestPurchasePayments = await prisma.purchasePayment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      code: true,
      amount: true,
      paymentDate: true,
      paymentMethod: true,
      billId: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(latestPurchasePayments, null, 2));

  console.log('\n--- EXPENSES (LATEST 5) ---');
  const latestExpenses = await prisma.expense.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      code: true,
      amount: true,
      expenseDate: true,
      category: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(latestExpenses, null, 2));

  console.log('\n--- BANK STATEMENTS / SYNC LOGS (IF ANY) ---');
  try {
    if (prisma.bankTransaction) {
      const bankTx = await prisma.bankTransaction.findMany({
        take: 5,
        orderBy: { transactionDate: 'desc' }
      });
      console.log('Bank transactions:', bankTx);
    }
  } catch (e) {
    console.log('No bankTransaction model');
  }

  // Check if there are any invoices or bills created today
  const todayInvoices = await prisma.salesInvoice.findMany({
    where: { createdAt: { gte: todayVN } },
    select: { code: true, total: true, status: true, paymentStatus: true, createdAt: true }
  });
  console.log('\n--- TODAY SALES INVOICES ---', todayInvoices);

  const todayBills = await prisma.purchaseBill.findMany({
    where: { createdAt: { gte: todayVN } },
    select: { code: true, total: true, status: true, paymentStatus: true, createdAt: true }
  });
  console.log('\n--- TODAY PURCHASE BILLS ---', todayBills);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
