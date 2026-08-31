'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { buildViewFilter, verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';

export async function updateEmployeeProfile(userId: string, profileData: any) {
    try {
        await verifyActionOwnership('USERS', 'EDIT', userId);

        const updated = await prisma.employeeProfile.upsert({
            where: { userId: userId },
            update: {
                identityNumber: profileData.identityNumber,
                taxCode: profileData.taxCode,
                bankAccount: profileData.bankAccount,
                bankName: profileData.bankName,
                dob: profileData.dob ? new Date(profileData.dob) : null,
                gender: profileData.gender,
                address: profileData.address,
                phoneNumber: profileData.phoneNumber,
                department: profileData.department,
                position: profileData.position,
                startDate: profileData.startDate ? new Date(profileData.startDate) : null,
                baseSalary: profileData.baseSalary || 0
            },
            create: {
                userId: userId,
                identityNumber: profileData.identityNumber,
                taxCode: profileData.taxCode,
                bankAccount: profileData.bankAccount,
                bankName: profileData.bankName,
                dob: profileData.dob ? new Date(profileData.dob) : null,
                gender: profileData.gender || 'OTHER',
                address: profileData.address,
                phoneNumber: profileData.phoneNumber,
                department: profileData.department,
                position: profileData.position,
                startDate: profileData.startDate ? new Date(profileData.startDate) : null,
                baseSalary: profileData.baseSalary || 0
            }
        });

        // Also update the User's department if it changed
        if (profileData.department) {
            // Note: Currently User doesn't explicitly have department unless it's just attached in UI. We simply update the Profile.
        }

        revalidatePath('/hr/employees');
        return { success: true, data: updated };
    } catch (e: any) {
        console.error("Update Profile Error:", e);
        return { success: false, error: e.message };
    }
}

export async function createLaborContract(userId: string, data: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) throw new Error("Unauthorized: Vui lòng đăng nhập");
        const isAdmin = session.user.role === 'ADMIN';
        const perms = (session.user.permissions as string[]) || [];
        if (!isAdmin && !perms.includes('EMPLOYEES_EDIT') && !perms.includes('EMPLOYEES_CREATE') && !perms.includes('USERS_EDIT')) {
            throw new Error("Forbidden: Bạn không có quyền thêm hợp đồng lao động");
        }

        const contract = await prisma.laborContract.create({
            data: {
                userId: userId,
                contractNumber: data.contractNumber,
                type: data.type,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                fileUrl: data.fileUrl,
                status: "ACTIVE",
                creatorId: session.user.id
            }
        });

        revalidatePath('/hr/employees');
        return { success: true, data: contract };
    } catch (e: any) {
        console.error("Create Contract Error:", e);
        return { success: false, error: e.message };
    }
}
