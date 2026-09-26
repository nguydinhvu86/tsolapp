const { Client } = require('ssh2');
const conn = new Client();

const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cashList = await prisma.cashTransaction.findMany({
    take: 8,
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
  console.log('=== CURRENT CASH BOOK TOP TRANSACTIONS ===');
  console.table(cashList.map(item => ({
    'Mã Phiếu': item.code,
    'Ngày Lập': new Date(item.transactionDate).toLocaleDateString('vi-VN'),
    'Loại': item.type === 'RECEIPT' ? 'Phiếu Thu' : 'Phiếu Chi',
    'Người Nộp / Nhận': item.payerReceiver,
    'Số Tiền (VNĐ)': new Intl.NumberFormat('vi-VN').format(item.amount),
    'Lý Do': item.reason
  })));
}

main().finally(() => prisma.$disconnect());
`;

conn.on('ready', () => {
  const b64 = Buffer.from(scriptContent).toString('base64');
  const cmd = `cd /www/wwwroot/inside.tsol.vn/tsolapp && export PATH=/www/server/nvm/versions/node/v24.14.0/bin:$PATH && echo "${b64}" | base64 -d > scripts/verify-cash-runner.js && node scripts/verify-cash-runner.js`;
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
