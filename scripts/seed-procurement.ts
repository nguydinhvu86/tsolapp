import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Procurement Seeding...");

    // Find a user and products
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log("No user found, please create one first.");
        return;
    }

    const products = await prisma.product.findMany({ take: 3 });
    if (products.length === 0) {
        console.log("No products found, please create some first.");
        return;
    }

    // 1. Create Suppliers
    const s1 = await prisma.supplier.create({
        data: {
            code: "NCC-001",
            name: "Công ty Cổ phần Công nghệ XYZ",
            email: "contact@xyz.vn",
            phone: "0901234567",
            address: "123 Đường Quang Trung, Hà Nội",
            totalDebt: 0
        }
    });

    const s2 = await prisma.supplier.create({
        data: {
            code: "NCC-002",
            name: "Nhà cung cấp Vật tư Phúc Hưng",
            email: "phuchung@gmail.com",
            phone: "0987654321",
            address: "45 Lê Lợi, TP. HCM",
            totalDebt: 0
        }
    });

    const s3 = await prisma.supplier.create({
        data: {
            code: "NCC-003",
            name: "Tập đoàn Vạn Phát",
            email: "info@vanphat.com.vn",
            phone: "0243123456",
            address: "KCN Bắc Thăng Long, Hà Nội",
            totalDebt: 0
        }
    });

    // 2. Create Purchase Orders
    const order1 = await prisma.purchaseOrder.create({
        data: {
            code: "PO-2026-001",
            supplierId: s1.id,
            creatorId: user.id,
            status: "COMPLETED",
            totalAmount: products[0].importPrice * 10,
            items: {
                create: [
                    {
                        productId: products[0].id,
                        quantity: 10,
                        unitPrice: products[0].importPrice,
                        totalPrice: products[0].importPrice * 10
                    }
                ]
            }
        }
    });

    const order2 = await prisma.purchaseOrder.create({
        data: {
            code: "PO-2026-002",
            supplierId: s2.id,
            creatorId: user.id,
            status: "SENT",
            totalAmount: (products[1]?.importPrice || 1000) * 5,
            items: {
                create: [
                    {
                        productId: products[1]?.id || products[0].id,
                        quantity: 5,
                        unitPrice: products[1]?.importPrice || 1000,
                        totalPrice: (products[1]?.importPrice || 1000) * 5
                    }
                ]
            }
        }
    });

    // 3. Create Purchase Bill
    const bill1 = await prisma.purchaseBill.create({
        data: {
            code: "PB-2026-001",
            supplierInvoice: "HD-XYZ-999",
            supplierId: s1.id,
            creatorId: user.id,
            orderId: order1.id,
            status: "APPROVED",
            totalAmount: products[0].importPrice * 10,
            items: {
                create: [
                    {
                        productId: products[0].id,
                        quantity: 10,
                        unitPrice: products[0].importPrice,
                        totalPrice: products[0].importPrice * 10
                    }
                ]
            }
        }
    });

    // Update debt
    await prisma.supplier.update({
        where: { id: s1.id },
        data: { totalDebt: products[0].importPrice * 10 }
    });

    console.log("Successfully created 3 Suppliers, 2 POs, and 1 Purchase Bill.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
