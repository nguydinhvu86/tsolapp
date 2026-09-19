import { prisma } from '@/lib/prisma';

export interface JournalLineInput {
    accountCode: string;
    debitAmount: number;
    creditAmount: number;
    description?: string;
    partnerType?: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE';
    partnerId?: string;
}

export interface CreateJournalEntryInput {
    entryNumber?: string;
    date?: Date;
    description: string;
    refType?: 'SALES_INVOICE' | 'SALES_PAYMENT' | 'PURCHASE_BILL' | 'PURCHASE_PAYMENT' | 'EXPENSE' | 'CASH_TRANSACTION' | 'MANUAL';
    refId?: string;
    creatorId?: string;
    lines: JournalLineInput[];
}

/**
 * Danh mục hệ thống tài khoản chuẩn kế toán doanh nghiệp Việt Nam (VAS TT200/133)
 */
export const DEFAULT_CHART_OF_ACCOUNTS = [
    { code: '111', name: 'Tiền mặt tại quỹ', type: 'ASSET', level: 1 },
    { code: '112', name: 'Tiền gửi ngân hàng', type: 'ASSET', level: 1 },
    { code: '131', name: 'Phải thu của khách hàng', type: 'ASSET', level: 1 },
    { code: '133', name: 'Thuế GTGT được khấu trừ', type: 'ASSET', level: 1 },
    { code: '141', name: 'Tạm ứng nhân viên', type: 'ASSET', level: 1 },
    { code: '156', name: 'Hàng hóa tồn kho', type: 'ASSET', level: 1 },
    { code: '211', name: 'Tài sản cố định hữu hình', type: 'ASSET', level: 1 },
    { code: '331', name: 'Phải trả cho người bán (NCC)', type: 'LIABILITY', level: 1 },
    { code: '3331', name: 'Thuế GTGT phải nộp', type: 'LIABILITY', level: 1 },
    { code: '334', name: 'Phải trả người lao động (Lương)', type: 'LIABILITY', level: 1 },
    { code: '411', name: 'Vốn đầu tư của chủ sở hữu', type: 'EQUITY', level: 1 },
    { code: '511', name: 'Doanh thu bán hàng và cung cấp dịch vụ', type: 'REVENUE', level: 1 },
    { code: '632', name: 'Giá vốn hàng bán (COGS)', type: 'EXPENSE', level: 1 },
    { code: '642', name: 'Chi phí quản lý doanh nghiệp', type: 'EXPENSE', level: 1 },
    { code: '811', name: 'Chi phí khác', type: 'EXPENSE', level: 1 },
    { code: '911', name: 'Xác định kết quả kinh doanh', type: 'EQUITY', level: 1 },
];

/**
 * Khởi tạo danh mục tài khoản mặc định nếu chưa tồn tại
 */
export async function seedChartOfAccounts() {
    for (const acc of DEFAULT_CHART_OF_ACCOUNTS) {
        await prisma.chartOfAccount.upsert({
            where: { code: acc.code },
            update: { name: acc.name, type: acc.type },
            create: {
                code: acc.code,
                name: acc.name,
                type: acc.type,
                level: acc.level,
                balance: 0,
                isActive: true
            }
        });
    }
}

/**
 * Tạo Bút toán Kép (Double-Entry Journal)
 * Ràng buộc nghiêm ngặt: Tổng Nợ (Total Debit) PHẢI BẰNG Tổng Có (Total Credit)
 */
export async function createJournalEntry(input: CreateJournalEntryInput) {
    if (!input.lines || input.lines.length < 2) {
        throw new Error('Bút toán kép phải có ít nhất 2 dòng (1 Nợ, 1 Có)');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of input.lines) {
        totalDebit += line.debitAmount || 0;
        totalCredit += line.creditAmount || 0;
    }

    // Làm tròn 2 chữ số thập phân để chống sai lệch micro
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;

    if (totalDebit !== totalCredit) {
        throw new Error(`Bút toán không cân đối! Tổng Nợ (${totalDebit.toLocaleString('vi-VN')} đ) khác Tổng Có (${totalCredit.toLocaleString('vi-VN')} đ)`);
    }

    const entryNumber = input.entryNumber || `JE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return await prisma.$transaction(async (tx) => {
        const entry = await tx.journalEntry.create({
            data: {
                entryNumber,
                date: input.date || new Date(),
                description: input.description,
                refType: input.refType || 'MANUAL',
                refId: input.refId || null,
                status: 'POSTED',
                totalDebit,
                totalCredit,
                creatorId: input.creatorId || null,
                lines: {
                    create: input.lines.map(line => ({
                        accountCode: line.accountCode,
                        debitAmount: line.debitAmount || 0,
                        creditAmount: line.creditAmount || 0,
                        description: line.description || input.description,
                        partnerType: line.partnerType || null,
                        partnerId: line.partnerId || null,
                    }))
                }
            },
            include: {
                lines: true
            }
        });

        // Cập nhật số dư tức thời vào bảng ChartOfAccount
        for (const line of input.lines) {
            const delta = (line.debitAmount || 0) - (line.creditAmount || 0);
            await tx.chartOfAccount.update({
                where: { code: line.accountCode },
                data: {
                    balance: { increment: delta }
                }
            });
        }

        return entry;
    });
}

/**
 * Tự động sinh bút toán hạch toán khi phát hành Hóa đơn Bán hàng (SalesInvoice)
 * Hạch toán: Nợ 131 (Phải thu KH) / Có 511 (Doanh thu), Có 3331 (Thuế GTGT)
 */
export async function postSalesInvoiceToLedger(invoiceId: string, creatorId?: string) {
    const invoice = await prisma.salesInvoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true }
    });

    if (!invoice) throw new Error('Không tìm thấy hóa đơn');

    const lines: JournalLineInput[] = [];
    const revenue = invoice.subTotal || (invoice.totalAmount - (invoice.taxAmount || 0));
    const tax = invoice.taxAmount || 0;
    const total = invoice.totalAmount;

    // Nợ 131: Tổng tiền phải thu của khách
    lines.push({
        accountCode: '131',
        debitAmount: total,
        creditAmount: 0,
        description: `Phải thu khách hàng ${invoice.customer?.name} theo HĐ ${invoice.code}`,
        partnerType: 'CUSTOMER',
        partnerId: invoice.customerId
    });

    // Có 511: Doanh thu bán hàng
    lines.push({
        accountCode: '511',
        debitAmount: 0,
        creditAmount: revenue,
        description: `Doanh thu bán hàng HĐ ${invoice.code}`
    });

    // Có 3331: Thuế GTGT đầu ra (nếu có)
    if (tax > 0) {
        lines.push({
            accountCode: '3331',
            debitAmount: 0,
            creditAmount: tax,
            description: `Thuế GTGT đầu ra HĐ ${invoice.code}`
        });
    }

    return await createJournalEntry({
        description: `Hạch toán doanh thu hóa đơn bán hàng ${invoice.code}`,
        refType: 'SALES_INVOICE',
        refId: invoice.id,
        creatorId,
        lines
    });
}

/**
 * Tự động sinh bút toán hạch toán khi nhận thanh toán từ khách hàng (SalesPayment)
 * Hạch toán: Nợ 111 (Tiền mặt) hoặc Nợ 112 (Tiền gửi NH) / Có 131 (Giảm nợ phải thu)
 */
export async function postSalesPaymentToLedger(paymentId: string, creatorId?: string) {
    const payment = await prisma.salesPayment.findUnique({
        where: { id: paymentId },
        include: { customer: true }
    });

    if (!payment) throw new Error('Không tìm thấy phiếu thu');

    const cashAccount = payment.paymentMethod === 'BANK_TRANSFER' ? '112' : '111';

    const lines: JournalLineInput[] = [
        {
            accountCode: cashAccount,
            debitAmount: payment.amount,
            creditAmount: 0,
            description: `Thu tiền ${payment.customer?.name} - Phiếu thu ${payment.code}`
        },
        {
            accountCode: '131',
            debitAmount: 0,
            creditAmount: payment.amount,
            description: `Giảm trừ công nợ phải thu ${payment.customer?.name}`,
            partnerType: 'CUSTOMER',
            partnerId: payment.customerId
        }
    ];

    return await createJournalEntry({
        description: `Hạch toán phiếu thu tiền khách hàng ${payment.code}`,
        refType: 'SALES_PAYMENT',
        refId: payment.id,
        creatorId,
        lines
    });
}
