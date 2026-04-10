'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function getSoftphoneCredentials() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            extension: true,
            sipPassword: true,
            role: true,
            permissions: true,
            permissionGroup: { select: { permissions: true } }
        }
    });

    if (!user) {
        throw new Error("User not found");
    }

    let perms: string[] = [];
    try {
        if (user.permissionGroup?.permissions) {
             perms = JSON.parse(user.permissionGroup.permissions);
        } else if (user.permissions) {
             perms = JSON.parse(user.permissions);
        }
    } catch {}

    const canUseSoftphone = user.role === 'ADMIN' || perms.includes('USE_SOFTPHONE');

    return {
        extension: user.extension,
        sipPassword: user.sipPassword,
        canUseSoftphone
    };
}

export async function lookupContactByPhone(phone: string) {
    if (!phone) return null;
    
    // Get last 9 digits for robust matching (+84 vs 0 prefix)
    const cleanPhone = phone.replace(/\D/g, '').slice(-9);
    if (!cleanPhone) return null;

    const customer = await prisma.customer.findFirst({
        where: { phone: { endsWith: cleanPhone } },
        select: { id: true, name: true }
    });

    if (customer) {
        return { type: 'customer', id: customer.id, name: customer.name };
    }

    const lead = await prisma.lead.findFirst({
         where: { phone: { endsWith: cleanPhone } },
         select: { id: true, name: true }
    });

    if (lead) {
         return { type: 'lead', id: lead.id, name: lead.name };
    }

    return null;
}
