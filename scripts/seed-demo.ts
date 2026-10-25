import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding demo data...');

    // 1. Create a Supplier if not exists
    const supplier = await prisma.supplier.upsert({
        where: { code: 'SUP-001' },
        update: {},
        create: {
            code: 'SUP-001',
            name: 'Nhà Cung Cấp Demo',
            email: 'contact@demo-supplier.com',
            phone: '0987654321',
            address: '123 ABC Street',
        }
    });

    // 2. Create some Products
    await prisma.product.upsert({
        where: { sku: 'SP-001' },
        update: {},
        create: {
            sku: 'SP-001',
            name: 'Laptop Dell Inspiron',
            type: 'PRODUCT',
            unit: 'Cái',
            taxRate: 10,
            importPrice: 15000000,
            salePrice: 18000000,
            description: 'Core i5, 8GB RAM, 256GB SSD',
        }
    });

    await prisma.product.upsert({
        where: { sku: 'SV-001' },
        update: {},
        create: {
            sku: 'SV-001',
            name: 'Dịch vụ bảo trì',
            type: 'SERVICE',
            unit: 'Gói',
            taxRate: 8,
            importPrice: 500000,
            salePrice: 1000000,
        }
    });

    console.log('Demo data created successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
