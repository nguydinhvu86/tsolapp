'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logCustomerActivity } from "@/lib/customerLogger";
import { revalidatePath } from 'next/cache';
import { sendEmailWithTracking } from '@/lib/mailer';
import { buildViewFilter, verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';
import { z } from 'zod';

import { lookupBusinessByTaxCode } from '@/lib/vietqr';

export async function lookupCustomerTaxCode(taxCode: string) {
    return await lookupBusinessByTaxCode(taxCode);
}

const customerSchema = z.object({
    code: z.string().optional().nullable(),
    name: z.string().min(1, "Tên khách hàng không được để trống"),
    shortName: z.string().optional().nullable(),
    internationalName: z.string().optional().nullable(),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")).nullable(),
    phone: z.string().optional().or(z.literal("")).nullable(),
    address: z.string().optional().or(z.literal("")).nullable(),
    billingAddress: z.string().optional().or(z.literal("")).nullable(),
    shippingAddress: z.string().optional().or(z.literal("")).nullable(),
    taxCode: z.string().optional().or(z.literal("")).nullable(),
    taxStatus: z.string().optional().or(z.literal("")).nullable(),
    contactName: z.string().optional().or(z.literal("")).nullable(),
    website: z.string().optional().or(z.literal("")).nullable(),
    businessType: z.string().optional().or(z.literal("")).nullable(),
    bankAccount: z.string().optional().or(z.literal("")).nullable(),
    bankName: z.string().optional().or(z.literal("")).nullable(),
    bankBranch: z.string().optional().or(z.literal("")).nullable(),
    paymentTerms: z.string().optional().or(z.literal("")).nullable(),
    creditLimit: z.union([z.number(), z.string().transform(v => (v ? parseFloat(v) : 0))]).optional().nullable(),
    internalNotes: z.string().optional().nullable()
});

const customerContactSchema = z.object({
    name: z.string().min(1, "Tên người liên hệ không được để trống"),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")).nullable(),
    position: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    otherPhone: z.string().optional().nullable(),
    birthday: z.union([z.string(), z.date()]).optional().nullable()
});

export type CustomerInputData = {
    code?: string | null;
    name: string;
    shortName?: string | null;
    internationalName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    billingAddress?: string | null;
    shippingAddress?: string | null;
    taxCode?: string | null;
    taxStatus?: string | null;
    contactName?: string | null;
    website?: string | null;
    businessType?: string | null;
    bankAccount?: string | null;
    bankName?: string | null;
    bankBranch?: string | null;
    paymentTerms?: string | null;
    creditLimit?: number | string | null;
    internalNotes?: string | null;
};

function normalizePhoneNumber(phone?: string | null): string {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('84') && digits.length >= 10) {
        digits = '0' + digits.slice(2);
    }
    return digits;
}

export async function checkCustomerDuplicate(
    data: { taxCode?: string | null; email?: string | null; phone?: string | null; code?: string | null },
    excludeId?: string
) {
    const taxCode = data.taxCode?.trim();
    const email = data.email?.trim()?.toLowerCase();
    const phone = data.phone?.trim();
    const code = data.code?.trim();

    const duplicates: { field: string; message: string; duplicateEntity?: any }[] = [];

    // 1. Check Code
    if (code) {
        const existing = await prisma.customer.findFirst({
            where: {
                code: { equals: code },
                ...(excludeId ? { id: { not: excludeId } } : {})
            },
            select: { id: true, code: true, name: true }
        });
        if (existing) {
            duplicates.push({
                field: 'code',
                message: `Mã khách hàng "${code}" đã tồn tại trên khách hàng "${existing.name}".`,
                duplicateEntity: existing
            });
        }
    }

    // 2. Check Tax Code (MST)
    if (taxCode) {
        const existing = await prisma.customer.findFirst({
            where: {
                taxCode: { equals: taxCode },
                ...(excludeId ? { id: { not: excludeId } } : {})
            },
            select: { id: true, code: true, name: true, taxCode: true }
        });
        if (existing) {
            duplicates.push({
                field: 'taxCode',
                message: `Mã số thuế "${taxCode}" đã tồn tại trên khách hàng "${existing.name}" (Mã: ${existing.code || 'Chưa có'}).`,
                duplicateEntity: existing
            });
        }
    }

    // 3. Check Email
    if (email) {
        const existing = await prisma.customer.findFirst({
            where: {
                email: { equals: email },
                ...(excludeId ? { id: { not: excludeId } } : {})
            },
            select: { id: true, code: true, name: true, email: true }
        });
        if (existing) {
            duplicates.push({
                field: 'email',
                message: `Email "${email}" đã tồn tại trên khách hàng "${existing.name}" (Mã: ${existing.code || 'Chưa có'}).`,
                duplicateEntity: existing
            });
        }
    }

    // 4. Check Phone (SĐT)
    if (phone) {
        const normInputPhone = normalizePhoneNumber(phone);
        const candidates = await prisma.customer.findMany({
            where: {
                phone: { not: null },
                ...(excludeId ? { id: { not: excludeId } } : {})
            },
            select: { id: true, code: true, name: true, phone: true }
        });

        const matching = candidates.find(c => {
            if (!c.phone) return false;
            if (c.phone.trim() === phone) return true;
            if (normInputPhone && normalizePhoneNumber(c.phone) === normInputPhone) return true;
            return false;
        });

        if (matching) {
            duplicates.push({
                field: 'phone',
                message: `Số điện thoại "${phone}" đã tồn tại trên khách hàng "${matching.name}" (Mã: ${matching.code || 'Chưa có'}).`,
                duplicateEntity: matching
            });
        }
    }

    return {
        hasDuplicate: duplicates.length > 0,
        duplicates
    };
}

export async function createCustomer(data: CustomerInputData) {
    await verifyActionPermission('CUSTOMERS_CREATE');
    const validatedData = customerSchema.parse(data);

    let code = validatedData.code?.trim();
    if (!code) {
        const count = await prisma.customer.count();
        code = `KH-${(count + 1).toString().padStart(4, '0')}`;
    }

    const email = validatedData.email?.trim() || null;
    const creditLimit = typeof validatedData.creditLimit === 'number' ? validatedData.creditLimit : 0;

    // Strict duplicate check before creating
    const dupCheck = await checkCustomerDuplicate({
        code,
        taxCode: validatedData.taxCode,
        email: validatedData.email,
        phone: validatedData.phone
    });

    if (dupCheck.hasDuplicate) {
        const msg = dupCheck.duplicates.map(d => `• ${d.message}`).join('\n');
        throw new Error(`CẢNH BÁO TRÙNG LẶP THÔNG TIN:\n${msg}\n\nHệ thống không cho phép tạo khách hàng bị trùng lặp MST, Email hoặc SĐT!`);
    }

    try {
        const customer = await prisma.customer.create({
            data: {
                code,
                name: validatedData.name.trim(),
                shortName: validatedData.shortName?.trim() || null,
                internationalName: validatedData.internationalName?.trim() || null,
                email,
                phone: validatedData.phone?.trim() || null,
                address: validatedData.address?.trim() || null,
                billingAddress: validatedData.billingAddress?.trim() || null,
                shippingAddress: validatedData.shippingAddress?.trim() || null,
                taxCode: validatedData.taxCode?.trim() || null,
                taxStatus: validatedData.taxStatus?.trim() || null,
                contactName: validatedData.contactName?.trim() || null,
                website: validatedData.website?.trim() || null,
                businessType: validatedData.businessType?.trim() || null,
                bankAccount: validatedData.bankAccount?.trim() || null,
                bankName: validatedData.bankName?.trim() || null,
                bankBranch: validatedData.bankBranch?.trim() || null,
                paymentTerms: validatedData.paymentTerms?.trim() || null,
                creditLimit,
                internalNotes: validatedData.internalNotes?.trim() || null
            }
        });

        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
            await logCustomerActivity(
                customer.id,
                session.user.id,
                'TẠO_MỚI',
                `Tạo mới hồ sơ khách hàng: ${customer.name} (Mã: ${customer.code || customer.id})`
            );
        }

        revalidatePath('/customers');
        return customer;
    } catch (error: any) {
        if (error.code === 'P2002') {
            if (error.meta?.target?.includes('email')) {
                throw new Error(`Cảnh báo: Email "${email}" đã tồn tại trong hệ thống. Vui lòng sử dụng email khác.`);
            }
            if (error.meta?.target?.includes('code')) {
                throw new Error(`Cảnh báo: Mã khách hàng "${code}" đã tồn tại. Vui lòng chọn mã khác.`);
            }
        }
        throw new Error(error.message || "Đã xảy ra lỗi khi tạo khách hàng.");
    }
}

export async function updateCustomer(id: string, data: CustomerInputData) {
    const cust = await prisma.customer.findUnique({ where: { id }, include: { managers: true } });
    if (!cust) throw new Error("Không tìm thấy khách hàng");
    const managers = cust.managers ? cust.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('CUSTOMERS', 'EDIT', '', managers);

    const validatedData = customerSchema.parse(data);
    const email = validatedData.email?.trim() || null;
    const creditLimit = typeof validatedData.creditLimit === 'number' ? validatedData.creditLimit : 0;

    // Strict duplicate check before updating
    const dupCheck = await checkCustomerDuplicate({
        code: validatedData.code,
        taxCode: validatedData.taxCode,
        email: validatedData.email,
        phone: validatedData.phone
    }, id);

    if (dupCheck.hasDuplicate) {
        const msg = dupCheck.duplicates.map(d => `• ${d.message}`).join('\n');
        throw new Error(`CẢNH BÁO TRÙNG LẶP THÔNG TIN:\n${msg}\n\nHệ thống không cho phép lưu thông tin bị trùng lặp MST, Email hoặc SĐT!`);
    }

    try {
        const customer = await prisma.customer.update({
            where: { id },
            data: {
                code: validatedData.code?.trim() || cust.code,
                name: validatedData.name.trim(),
                shortName: validatedData.shortName?.trim() || null,
                internationalName: validatedData.internationalName?.trim() || null,
                email,
                phone: validatedData.phone?.trim() || null,
                address: validatedData.address?.trim() || null,
                billingAddress: validatedData.billingAddress?.trim() || null,
                shippingAddress: validatedData.shippingAddress?.trim() || null,
                taxCode: validatedData.taxCode?.trim() || null,
                taxStatus: validatedData.taxStatus?.trim() || null,
                contactName: validatedData.contactName?.trim() || null,
                website: validatedData.website?.trim() || null,
                businessType: validatedData.businessType?.trim() || null,
                bankAccount: validatedData.bankAccount?.trim() || null,
                bankName: validatedData.bankName?.trim() || null,
                bankBranch: validatedData.bankBranch?.trim() || null,
                paymentTerms: validatedData.paymentTerms?.trim() || null,
                creditLimit,
                internalNotes: validatedData.internalNotes?.trim() || null
            }
        });

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
        revalidatePath(`/customers/${id}`);
        return customer;
    } catch (error: any) {
        if (error.code === 'P2002') {
            if (error.meta?.target?.includes('email')) {
                throw new Error(`Cảnh báo: Email "${email}" đã được sử dụng bởi một khách hàng khác.`);
            }
            if (error.meta?.target?.includes('code')) {
                throw new Error(`Cảnh báo: Mã khách hàng "${data.code}" đã được sử dụng.`);
            }
        }
        throw new Error(error.message || "Đã xảy ra lỗi khi cập nhật khách hàng.");
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

    const validatedData = customerContactSchema.parse(data);
    data.name = validatedData.name;
    data.email = validatedData.email ?? undefined;
    data.position = validatedData.position ?? undefined;
    data.phone = validatedData.phone ?? undefined;
    data.otherPhone = validatedData.otherPhone ?? undefined;
    // Keep birthday as is since it is Date | null and schema accepts string/date

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

        const validatedData = customerContactSchema.parse(data);
        data.name = validatedData.name;
        data.email = validatedData.email ?? undefined;
        data.position = validatedData.position ?? undefined;
        data.phone = validatedData.phone ?? undefined;
        data.otherPhone = validatedData.otherPhone ?? undefined;

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