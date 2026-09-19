import { prisma } from '@/lib/prisma';

export interface SetUnitConversionInput {
    productId: string;
    unitName: string;
    conversionRate: number; // e.g. 1 Thùng = 24 Cái -> 24
    isBaseUnit?: boolean;
    salePrice?: number | null;
}

/**
 * Thêm hoặc cập nhật đơn vị tính phụ cho sản phẩm
 */
export async function setProductUnitConversion(input: SetUnitConversionInput) {
    if (input.conversionRate <= 0) {
        throw new Error('Tỷ lệ quy đổi phải lớn hơn 0');
    }

    return await prisma.productUnitConversion.upsert({
        where: {
            productId_unitName: {
                productId: input.productId,
                unitName: input.unitName
            }
        },
        update: {
            conversionRate: input.conversionRate,
            isBaseUnit: input.isBaseUnit || false,
            salePrice: input.salePrice || null
        },
        create: {
            productId: input.productId,
            unitName: input.unitName,
            conversionRate: input.conversionRate,
            isBaseUnit: input.isBaseUnit || false,
            salePrice: input.salePrice || null
        }
    });
}

/**
 * Quy đổi số lượng từ một đơn vị bất kỳ về đơn vị cơ bản (Base Unit)
 */
export async function convertToBaseUnit(productId: string, fromUnitName: string, quantity: number): Promise<number> {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { unit: true }
    });

    if (!product) throw new Error('Không tìm thấy sản phẩm');

    // Nếu chính là đơn vị gốc
    if (fromUnitName === product.unit) {
        return quantity;
    }

    const conversion = await prisma.productUnitConversion.findUnique({
        where: {
            productId_unitName: {
                productId,
                unitName: fromUnitName
            }
        }
    });

    if (!conversion) {
        // Nếu không có bảng quy đổi, mặc định 1:1
        return quantity;
    }

    return quantity * conversion.conversionRate;
}

/**
 * Lấy danh sách tất cả các đơn vị tính có sẵn của một sản phẩm (gồm đơn vị gốc và các đơn vị phụ)
 */
export async function getProductUnits(productId: string) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { unit: true, salePrice: true }
    });

    if (!product) return [];

    const conversions = await prisma.productUnitConversion.findMany({
        where: { productId },
        orderBy: { conversionRate: 'asc' }
    });

    const units = [
        {
            unitName: product.unit,
            conversionRate: 1,
            isBaseUnit: true,
            salePrice: product.salePrice
        },
        ...conversions.map(c => ({
            unitName: c.unitName,
            conversionRate: c.conversionRate,
            isBaseUnit: c.isBaseUnit,
            salePrice: c.salePrice ?? (product.salePrice * c.conversionRate)
        }))
    ];

    return units;
}
