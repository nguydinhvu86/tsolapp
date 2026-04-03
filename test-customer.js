const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const customerId = 'cmn9vl29v0000thwku8so7rff';
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId },
      include: {
          salesPayments: true,
          salesOrders: true,
          salesInvoices: true,
          salesEstimates: true
      }
    });
    console.log('SUCCESS');
  } catch(e) {
    fs.writeFileSync('error_dump.txt', e.message);
    console.log('WROTE ERROR TO error_dump.txt');
  }
}

main().finally(() => prisma.$disconnect());
