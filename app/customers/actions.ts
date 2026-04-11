'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logCustomerActivity } from "@/lib/customerLogger";
import { revalidatePath } from 'next/cache';
import { sendEmailWithTracking } from '@/lib/mailer';
import { buildViewFilter, verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';

export async function createCustomer(data: { name: string, email?: string, phone?: string, address?: string, taxCode?: string }) {
    await verifyActionPermission('CUSTOMERS_CREATE');
    if (data.email) data.email = data.email.trim();
    if (!data.email) data.email = undefined; // Prisma expects undefined/null to not insert an empty string

    try {
        const customer = await prisma.customer.create({ data: { ...data, email: data.email || null } });

        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            await logCustomerActivity(
                customer.id,
                session.user.id,
                'TẠO_MỚI',
                `Tạo mới hồ sơ khách hàng: ${customer.name}`
            );
        }

        revalidatePath('/customers');
        return customer;
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            throw new Error(`Cảnh báo: Email "${data.email}" đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.`);
        }
        throw new Error("Đã xảy ra lỗi khi tạo khách hàng.");
    }
}

export async function updateCustomer(id: string, data: { name: string, email?: string, phone?: string, address?: string, taxCode?: string }) {
    const cust = await prisma.customer.findUnique({ where: { id }, include: { managers: true } });
    if (!cust) throw new Error("Not found");
    const managers = cust.managers ? cust.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('CUSTOMERS', 'EDIT', '', managers);

    if (data.email) data.email = data.email.trim();
    if (!data.email) data.email = undefined;

    try {
        const customer = await prisma.customer.update({ where: { id }, data: { ...data, email: data.email || null } });

        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            await logCustomerActivity(
                customer.id,
                session.user.id,
                'CẬP_NHẬT',
                `Cập nhật hồ sơ khách hàng: ${customer.name}`
            );
        }

        revalidatePath('/customers');
        return customer;
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            throw new Error(`Cảnh báo: Email "${data.email}" đã được sử dụng bởi một khách hàng khác.`);
        }
        throw new Error("Đã xảy ra lỗi khi cập nhật khách hàng.");
    }
}

export async function deleteCustomer(id: string) {
    const cust = await prisma.customer.findUnique({ where: { id }, include: { managers: true } });
    if (!cust) throw new Error("Not found");
    const managers = cust.managers ? cust.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('CUSTOMERS', 'DELETE', '', managers);

    await prisma.customer.delete({ where: { id } });
    revalidatePath('/customers');
}

export async function getCustomers() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    const permissions = session.user.permissions as string[] || [];
    const viewAll = permissions.includes('CUSTOMERS_VIEW_ALL');
    const viewOwn = permissions.includes('CUSTOMERS_VIEW_OWN');

    if (!viewAll && !viewOwn) return [];

    if (viewAll) {
        return await prisma.customer.findMany({ orderBy: { name: 'asc' } });
    }

    // Intrinsic Ownership: A user owns a customer if they created documents related to them or have activity logs
    return await prisma.customer.findMany({
        where: {
            OR: [
                { activityLogs: { some: { userId: session.user.id } } },
                { quotes: { some: { creatorId: session.user.id } } },
                { contracts: { some: { creatorId: session.user.id } } },
                { salesOrders: { some: { creatorId: session.user.id } } },
                { leads: { some: { creatorId: session.user.id } } },
                { managers: { some: { id: session.user.id } } }
            ]
        },
        orderBy: { name: 'asc' }
    });
}

export async function sendDebtConfirmationEmail(customerId: string, to: string, subject: string, htmlBody: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            return { success: false, error: "Không tìm thấy khách hàng." };
        }

        const res = await sendEmailWithTracking({
            to,
            subject,
            htmlBody,
            senderId: session.user.id,
            customerId: customerId,
        });

        if (res.success) {
            await logCustomerActivity(
                customerId,
                session.user.id,
                'GỬI_EMAIL',
                `Đã gửi Email Xác nhận Công nợ đến ${to}`
            );
        }

        return res;
    } catch (error: any) {
        console.error("Lỗi khi gửi email xác nhận công nợ:", error);
        return { success: false, error: error.message };
    }
}

export async function saveCustomerMenuOrder(userId: string, menuOrderJson: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { customerMenuOrder: menuOrderJson }
        });
        return { success: true };
    } catch (e: any) {
        console.error("Save customer menu order error", e);
        return { success: false, error: "Failed to save menu ordering" };
    }
}

// ==========================================
// Customer Managers Actions
// ==========================================

export async function assignCustomerManagers(customerId: string, userIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const cust = await prisma.customer.findUnique({ where: { id: customerId }, include: { managers: true } });
    if (!cust) throw new Error("Not found");
    const managers = cust.managers ? cust.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('CUSTOMERS', 'EDIT', '', managers);

    try {
        const customer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                managers: {
                    connect: userIds.map(id => ({ id }))
                }
            },
            include: { managers: { select: { id: true, name: true } } }
        });

        await logCustomerActivity(
            customerId,
            session.user.id,
            'CẬP_NHẬT_NGƯỜI_PHỤ_TRÁCH',
            `Đã thêm ${userIds.length} người phụ trách mới cho khách hàng.`
        );

        revalidatePath(`/customers/${customerId}`);
        revalidatePath('/customers');
        return customer;
    } catch (error: any) {
        console.error("Lỗi khi thêm người phụ trách:", error);
        throw new Error("Không thể thêm người phụ trách. Vui lòng thử lại.");
    }
}

export async function removeCustomerManager(customerId: string, userId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const cust = await prisma.customer.findUnique({ where: { id: customerId }, include: { managers: true } });
    if (!cust) throw new Error("Not found");
    const managers = cust.managers ? cust.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('CUSTOMERS', 'EDIT', '', managers);

    try {
        const userToRemove = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
        const customer = await prisma.customer.update({
            where: { id: customerId },
            data: {
                managers: {
                    disconnect: { id: userId }
                }
            }
        });

        await logCustomerActivity(
            customerId,
            session.user.id,
            'CẬP_NHẬT_NGƯỜI_PHỤ_TRÁCH',
            `Đã xóa người phụ trách ${userToRemove?.name || userId} khỏi khách hàng.`
        );

        revalidatePath(`/customers/${customerId}`);
        revalidatePath('/customers');
        return customer;
    } catch (error: any) {
        console.error("Lỗi khi xóa người phụ trách:", error);
        throw new Error("Không thể xóa người phụ trách. Vui lòng thử lại.");
    }
}

// ==========================================
// Customer Contacts Actions
// ==========================================

export async function createCustomerContact(customerId: string, data: { name: string, email?: string, position?: string, phone?: string, otherPhone?: string, birthday?: Date | null }) {
    const cust = await prisma.customer.findUnique({ where: { id: customerId }, include: { managers: true } });
    if (!cust) throw new Error("Not found");
    const managers = cust.managers ? cust.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('CUSTOMERS', 'EDIT', '', managers);

    try {
        const contact = await prisma.customerContact.create({
            data: {
                customerId,
                name: data.name,
                email: data.email || null,
                position: data.position || null,
                phone: data.phone || null,
                otherPhone: data.otherPhone || null,
                birthday: data.birthday || null,
            }
        });

        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            await logCustomerActivity(
                customerId,
                session.user.id,
                'TẠO_LIÊN_HỆ',
                `Đã thêm người liên hệ: ${contact.name} (${contact.position || 'Không có chức vụ'})`
            );
        }

        revalidatePath('/customers');
        return { success: true, contact };
    } catch (e: any) {
        console.error("Create contact error", e);
        return { success: false, error: e.message };
    }
}

export async function updateCustomerContact(contactId: string, data: { name: string, email?: string, position?: string, phone?: string, otherPhone?: string, birthday?: Date | null }) {
    try {
        const existing = await prisma.customerContact.findUnique({ where: { id: contactId } });
        if (!existing) throw new Error("Not found");

        const cust = await prisma.customer.findUnique({ where: { id: existing.customerId }, include: { managers: true } });
        if (!cust) throw new Error("Not found");
        const managers = cust.managers ? cust.managers.map((m: any) => m.id) : [];
        await verifyActionOwnership('CUSTOMERS', 'EDIT', '', managers);

        const contact = await prisma.customerContact.update({
            where: { id: contactId },
            data: {
                name: data.name,
                email: data.email || null,
                position: data.position || null,
                phone: data.phone || null,
                otherPhone: data.otherPhone || null,
                birthday: data.birthday || null,
            }
        });

        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            await logCustomerActivity(
                contact.customerId,
                session.user.id,
                'CẬP_NHẬT_LIÊN_HỆ',
                `Đã cập nhật thông tin người liên hệ: ${contact.name}`
            );
        }

        revalidatePath('/customers');
        return { success: true, contact };
    } catch (e: any) {
        console.error("Update contact error", e);
        return { success: false, error: e.message };
    }
}

export async function deleteCustomerContact(contactId: string) {
    try {
        const existing = await prisma.customerContact.findUnique({ where: { id: contactId } });
        if (!existing) throw new Error("Not found");

        const cust = await prisma.customer.findUnique({ where: { id: existing.customerId }, include: { managers: true } });
        if (!cust) throw new Error("Not found");
        const managers = cust.managers ? cust.managers.map((m: any) => m.id) : [];
        await verifyActionOwnership('CUSTOMERS', 'EDIT', '', managers);

        const contact = await prisma.customerContact.delete({
            where: { id: contactId }
        });

        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            await logCustomerActivity(
                contact.customerId,
                session.user.id,
                'XÓA_LIÊN_HỆ',
                `Đã xóa người liên hệ: ${contact.name}`
            );
        }

        revalidatePath('/customers');
        return { success: true };
    } catch (e: any) {
        console.error("Delete contact error", e);
        return { success: false, error: e.message };
    }
}