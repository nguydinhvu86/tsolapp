const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log('=== SERVER CHECK ===');
  console.log('Server time (UTC):', now.toISOString());
  console.log('Server time (Local):', now.toString());

  const todayVN = new Date('2026-09-22T00:00:00+07:00');
  const todayUTC = new Date('2026-09-22T00:00:00Z');

  console.log('\\n=== LATEST 10 CASH TRANSACTIONS ===');
  const latestCash = await prisma.cashTransaction.findMany({
    take: 10,
    orderBy: { transactionDate: 'desc' },
    select: {
      id: true,
      code: true,
      type: true,
      transactionDate: true,
      amount: true,
      reason: true,
      payerReceiver: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(latestCash, null, 2));

  console.log('\\n=== CASH TRANSACTIONS (CREATED >= 2026-09-22) ===');
  const todayCash = await prisma.cashTransaction.findMany({
    where: {
      OR: [
        { transactionDate: { gte: todayVN } },
        { createdAt: { gte: todayVN } }
      ]
    }
  });
  console.log('Count:', todayCash.length, JSON.stringify(todayCash, null, 2));

  console.log('\\n=== SALES PAYMENTS (LATEST 5) ===');
  const salesPay = await prisma.salesPayment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(salesPay, null, 2));

  console.log('\\n=== SALES PAYMENTS (CREATED >= 2026-09-22) ===');
  const todaySalesPay = await prisma.salesPayment.findMany({
    where: {
      OR: [
        { date: { gte: todayVN } },
        { createdAt: { gte: todayVN } }
      ]
    }
  });
  console.log('Count:', todaySalesPay.length, JSON.stringify(todaySalesPay, null, 2));

  console.log('\\n=== PURCHASE PAYMENTS (LATEST 5) ===');
  const purPay = await prisma.purchasePayment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(purPay, null, 2));

  console.log('\\n=== PURCHASE PAYMENTS (CREATED >= 2026-09-22) ===');
  const todayPurPay = await prisma.purchasePayment.findMany({
    where: {
      OR: [
        { date: { gte: todayVN } },
        { createdAt: { gte: todayVN } }
      ]
    }
  });
  console.log('Count:', todayPurPay.length, JSON.stringify(todayPurPay, null, 2));

  console.log('\\n=== BANK / IMAP TRANSACTIONS OR LOGS ===');
  // Check any other models in prisma
  const keys = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  console.log('All Prisma Models:', keys);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
  const b64 = Buffer.from(scriptContent).toString('base64');
  const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && echo "${b64}" | base64 -d > scripts/check-today-runner.js && node scripts/check-today-runner.js`;
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
