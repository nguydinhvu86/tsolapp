import { prisma } from '@/lib/prisma';

/**
 * Tính đơn giá vốn bình quân gia quyền tức thời (Moving Average Cost) cho sản phẩm
 * Công thức: Đơn giá vốn = Tổng giá trị các đợt nhập hàng chia cho tổng số lượng nhập hàng
 */
export async function getProductMovingAverageCost(productId: string): Promise<number> {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { importPrice: true }
    });

    if (!product) return 0;

    // Lấy các dòng nhập hàng từ PurchaseBillItem (chỉ lấy hóa đơn mua hàng đã duyệt/hoàn tất)
    const purchaseItems = await prisma.purchaseBillItem.findMany({
        where: {
            productId,
            bill: {
                status: { in: ['APPROVED', 'PARTIAL_PAID', 'PAID'] }
            }
        },
        select: {
            quantity: true,
            unitPrice: true,
            totalPrice: true
        }
    });

    if (purchaseItems.length === 0) {
        // Nếu chưa có hóa đơn mua hàng thực tế, lấy đơn giá nhập mặc định
        return product.importPrice || 0;
    }

    let totalQuantity = 0;
    let totalCost = 0;

    for (const item of purchaseItems) {
        if (item.quantity > 0) {
            totalQuantity += item.quantity;
            totalCost += (item.totalPrice || (item.quantity * item.unitPrice));
        }
    }

    if (totalQuantity === 0) return product.importPrice || 0;

    // Đơn giá vốn bình quân gia quyền
    return Math.round((totalCost / totalQuantity) * 100) / 100;
}

/**
 * Phân tích Doanh thu, Giá vốn hàng bán (COGS) và Lợi nhuận gộp của một hóa đơn bán hàng
 */
export async function calculateInvoiceProfitability(invoiceId: string) {
    const invoice = await prisma.salesInvoice.findUnique({
        where: { id: invoiceId },
        include: {
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    if (!invoice) throw new Error('Không tìm thấy hóa đơn bán hàng');

    let totalRevenue = invoice.subTotal || 0;
    let totalCogs = 0;

    const itemsAnalysis = [];

    for (const item of invoice.items) {
        let itemCost = 0;
        if (item.productId) {
            const avgCost = await getProductMovingAverageCost(item.productId);
            itemCost = avgCost * item.quantity;
        } else {
            // Sản phẩm ngoài hoặc dịch vụ
            itemCost = 0;
        }

        const itemRevenue = item.totalPrice || (item.quantity * item.unitPrice);
        const itemGrossProfit = itemRevenue - itemCost;
        const itemMargin = itemRevenue > 0 ? Math.round((itemGrossProfit / itemRevenue) * 10000) / 100 : 0;

        totalCogs += itemCost;

        itemsAnalysis.push({
            itemId: item.id,
            customName: item.customName || item.product?.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            revenue: itemRevenue,
            unitCost: item.productId ? Math.round((itemCost / item.quantity) * 100) / 100 : 0,
            totalCost: itemCost,
            grossProfit: itemGrossProfit,
            marginPercent: itemMargin
        });
    }

    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;

    return {
        invoiceId: invoice.id,
        invoiceCode: invoice.code,
        date: invoice.date,
        totalRevenue,
        totalCogs,
        grossProfit,
        grossMarginPercent,
        itemsAnalysis
    };
}
