'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifyActionOwnership } from '@/lib/permissions';

export interface EmployeeProfilePayload {
    employeeCode?: string;
    identityNumber?: string;
    identityDate?: string | Date | null;
    identityPlace?: string;
    taxCode?: string;
    bankAccount?: string;
    bankName?: string;
    bankBranch?: string;
    dob?: string | Date | null;
    gender?: string;
    placeOfOrigin?: string;
    permanentAddress?: string;
    currentAddress?: string;
    address?: string;
    phoneNumber?: string;
    personalEmail?: string;
    nationality?: string;
    ethnicity?: string;
    maritalStatus?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    department?: string;
    position?: string;
    employmentStatus?: string;
    workLocation?: string;
    startDate?: string | Date | null;
    probationEndDate?: string | Date | null;
    officialStartDate?: string | Date | null;
    resignationDate?: string | Date | null;
    baseSalary?: number;
    insuranceSalary?: number;
    allowances?: number;
    socialInsuranceNumber?: string;
    healthInsuranceCardNumber?: string;
    healthInsurancePlace?: string;
    educationLevel?: string;
    major?: string;
    schoolName?: string;
    graduationYear?: number | null;
}

export async function updateEmployeeProfile(userId: string, data: EmployeeProfilePayload) {
    try {
        await verifyActionOwnership('USERS', 'EDIT', userId);

        const parseDate = (d: any) => d ? new Date(d) : null;
        const parseNum = (n: any) => n !== undefined && n !== null && n !== '' ? parseFloat(n) : 0;
        const parseIntVal = (n: any) => n !== undefined && n !== null && n !== '' ? parseInt(n) : null;

        const updateData = {
            employeeCode: data.employeeCode || null,
            identityNumber: data.identityNumber || null,
            identityDate: parseDate(data.identityDate),
            identityPlace: data.identityPlace || null,
            taxCode: data.taxCode || null,
            bankAccount: data.bankAccount || null,
            bankName: data.bankName || null,
            bankBranch: data.bankBranch || null,
            dob: parseDate(data.dob),
            gender: data.gender || 'MALE',
            placeOfOrigin: data.placeOfOrigin || null,
            permanentAddress: data.permanentAddress || null,
            currentAddress: data.currentAddress || null,
            address: data.address || data.permanentAddress || null,
            phoneNumber: data.phoneNumber || null,
            personalEmail: data.personalEmail || null,
            nationality: data.nationality || 'Việt Nam',
            ethnicity: data.ethnicity || 'Kinh',
            maritalStatus: data.maritalStatus || 'SINGLE',
            emergencyContact: data.emergencyContact || null,
            emergencyPhone: data.emergencyPhone || null,
            department: data.department || null,
            position: data.position || null,
            employmentStatus: data.employmentStatus || 'OFFICIAL',
            workLocation: data.workLocation || null,
            startDate: parseDate(data.startDate),
            probationEndDate: parseDate(data.probationEndDate),
            officialStartDate: parseDate(data.officialStartDate),
            resignationDate: parseDate(data.resignationDate),
            baseSalary: parseNum(data.baseSalary),
            insuranceSalary: parseNum(data.insuranceSalary),
            allowances: parseNum(data.allowances),
            socialInsuranceNumber: data.socialInsuranceNumber || null,
            healthInsuranceCardNumber: data.healthInsuranceCardNumber || null,
            healthInsurancePlace: data.healthInsurancePlace || null,
            educationLevel: data.educationLevel || null,
            major: data.major || null,
            schoolName: data.schoolName || null,
            graduationYear: parseIntVal(data.graduationYear)
        };

        const updated = await prisma.employeeProfile.upsert({
            where: { userId: userId },
            update: updateData,
            create: {
                userId: userId,
                ...updateData
            }
        });

        revalidatePath('/hr/employees');
        revalidatePath('/hr/payroll');
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
                type: data.type || 'PROBATION',
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                fileUrl: data.fileUrl || null,
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

export async function deleteLaborContract(contractId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) throw new Error("Unauthorized: Vui lòng đăng nhập");
        const isAdmin = session.user.role === 'ADMIN';
        const perms = (session.user.permissions as string[]) || [];
        if (!isAdmin && !perms.includes('EMPLOYEES_EDIT') && !perms.includes('USERS_EDIT')) {
            throw new Error("Forbidden: Bạn không có quyền xóa hợp đồng lao động");
        }

        await prisma.laborContract.delete({
            where: { id: contractId }
        });

        revalidatePath('/hr/employees');
        return { success: true };
    } catch (e: any) {
        console.error("Delete Contract Error:", e);
        return { success: false, error: e.message };
    }
}
