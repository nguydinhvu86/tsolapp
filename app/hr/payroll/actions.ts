'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifyActionPermission } from "@/lib/permissions";

// Số tiền phạt chuẩn mỗi lần đi muộn (VND)
const LATE_PENALTY_AMOUNT = 50000;
// Tổng công chuẩn mỗi tháng 
const STANDARD_WORK_DAYS = 26;

export async function generatePayroll(month: number, year: number) {
    try {
        await verifyActionPermission('PAYROLL_MANAGE');

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // Lấy tất cả nhân viên còn hoạt động kèm hồ sơ và dữ liệu chấm công
        const users = await prisma.user.findMany({
            where: { isActive: true },
            include: {
                employeeProfile: true,
                attendances: {
                    where: { date: { gte: startDate, lte: endDate } }
                }
            }
        });

        // Lấy danh sách ngày nghỉ phép có hưởng lương đã duyệt
        const approvedLeaves = await prisma.leaveRequest.findMany({
            where: {
                status: 'APPROVED',
                type: { in: ['ANNUAL_LEAVE', 'SPECIAL_LEAVE'] },
                startDate: { lte: endDate },
                endDate: { gte: startDate }
            }
        });

        for (const user of users) {
            let baseSalary = user.employeeProfile?.baseSalary || 0;
            let totalPresent = 0;
            let totalLate = 0;
            let totalHalfDay = 0;

            user.attendances.forEach(att => {
                if (att.status === 'PRESENT') totalPresent++;
                if (att.status === 'LATE') { totalPresent++; totalLate++; }
                if (att.status === 'HALF_DAY') totalHalfDay++;
            });

            // Tính thêm các ngày nghỉ phép hưởng nguyên lương
            const userLeaves = approvedLeaves.filter(l => l.userId === user.id);
            let paidLeaveDays = userLeaves.reduce((acc, l) => acc + (l.totalDays || 1), 0);

            let workDays = totalPresent + (totalHalfDay * 0.5) + paidLeaveDays;
            if (workDays > STANDARD_WORK_DAYS) workDays = STANDARD_WORK_DAYS;

            const latePenalties = totalLate * LATE_PENALTY_AMOUNT;

            // Kiểm tra xem kỳ lương này đã có bản ghi chưa để bảo toàn các khoản nhập tay
            const existing = await prisma.payroll.findUnique({
                where: { userId_month_year: { userId: user.id, month, year } }
            });

            const commissionBonus = existing?.commissionBonus || 0;
            const bonus = existing?.bonus || 0;
            const otSalary = existing?.otSalary || 0;
            const advancePayment = existing?.advancePayment || 0;
            const insuranceDeduction = existing?.insuranceDeduction || 0;
            const taxDeduction = existing?.taxDeduction || 0;
            const otherDeductions = existing?.deductions || 0;
            const notes = existing?.notes || null;
            const currentAllowances = existing?.allowances || 0;
            const currentBaseSalary = existing ? (existing.baseSalary || baseSalary) : baseSalary;

            const actualSalary = (currentBaseSalary / STANDARD_WORK_DAYS) * workDays;
            const grossEarnings = actualSalary + currentAllowances + commissionBonus + bonus + otSalary;
            const totalDeductions = latePenalties + advancePayment + insuranceDeduction + taxDeduction + otherDeductions;
            const netSalary = Math.round(Math.max(0, grossEarnings - totalDeductions));

            await prisma.payroll.upsert({
                where: { userId_month_year: { userId: user.id, month, year } },
                update: {
                    baseSalary: currentBaseSalary,
                    workDays,
                    allowances: currentAllowances,
                    latePenalties,
                    netSalary,
                    // Giữ nguyên trạng thái nếu đã duyệt
                    status: existing?.status || "DRAFT"
                },
                create: {
                    userId: user.id,
                    month,
                    year,
                    baseSalary: currentBaseSalary,
                    workDays,
                    allowances: currentAllowances,
                    commissionBonus,
                    bonus,
                    otSalary,
                    latePenalties,
                    advancePayment,
                    insuranceDeduction,
                    taxDeduction,
                    deductions: otherDeductions,
                    netSalary,
                    notes,
                    status: "DRAFT"
                }
            });
        }

        revalidatePath('/hr/payroll');
        return { success: true };
    } catch (e: any) {
        console.error("Generate Payroll Error:", e);
        return { success: false, error: e.message };
    }
}

export interface UpdatePayrollPayload {
    baseSalary?: number;
    workDays?: number;
    allowances?: number;
    commissionBonus?: number;
    bonus?: number;
    otSalary?: number;
    latePenalties?: number;
    advancePayment?: number;
    insuranceDeduction?: number;
    taxDeduction?: number;
    deductions?: number;
    notes?: string;
    status?: string;
    paymentDate?: Date | string | null;
}

export async function updatePayrollRecord(id: string, data: UpdatePayrollPayload) {
    try {
        await verifyActionPermission('PAYROLL_MANAGE');

        const existing = await prisma.payroll.findUnique({ where: { id } });
        if (!existing) throw new Error("Không tìm thấy bản ghi lương.");

        const baseSalary = data.baseSalary !== undefined ? Number(data.baseSalary) : existing.baseSalary;
        const workDays = data.workDays !== undefined ? Number(data.workDays) : existing.workDays;
        const allowances = data.allowances !== undefined ? Number(data.allowances) : existing.allowances;
        const commissionBonus = data.commissionBonus !== undefined ? Number(data.commissionBonus) : existing.commissionBonus;
        const bonus = data.bonus !== undefined ? Number(data.bonus) : existing.bonus;
        const otSalary = data.otSalary !== undefined ? Number(data.otSalary) : existing.otSalary;

        const latePenalties = data.latePenalties !== undefined ? Number(data.latePenalties) : existing.latePenalties;
        const advancePayment = data.advancePayment !== undefined ? Number(data.advancePayment) : existing.advancePayment;
        const insuranceDeduction = data.insuranceDeduction !== undefined ? Number(data.insuranceDeduction) : existing.insuranceDeduction;
        const taxDeduction = data.taxDeduction !== undefined ? Number(data.taxDeduction) : existing.taxDeduction;
        const otherDeductions = data.deductions !== undefined ? Number(data.deductions) : existing.deductions;

        const actualSalary = (baseSalary / STANDARD_WORK_DAYS) * workDays;
        const grossEarnings = actualSalary + allowances + commissionBonus + bonus + otSalary;
        const totalDeductions = latePenalties + advancePayment + insuranceDeduction + taxDeduction + otherDeductions;
        const netSalary = Math.round(Math.max(0, grossEarnings - totalDeductions));

        const updated = await prisma.payroll.update({
            where: { id },
            data: {
                baseSalary,
                workDays,
                allowances,
                commissionBonus,
                bonus,
                otSalary,
                latePenalties,
                advancePayment,
                insuranceDeduction,
                taxDeduction,
                deductions: otherDeductions,
                netSalary,
                notes: data.notes !== undefined ? data.notes : existing.notes,
                status: data.status || existing.status,
                paymentDate: data.paymentDate !== undefined ? (data.paymentDate ? new Date(data.paymentDate) : null) : existing.paymentDate
            }
        });

        revalidatePath('/hr/payroll');
        return { success: true, data: updated };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function batchUpdatePayrollStatus(ids: string[], status: 'APPROVED' | 'PAID' | 'DRAFT') {
    try {
        await verifyActionPermission('PAYROLL_MANAGE');
        const session = await getServerSession(authOptions);

        await prisma.payroll.updateMany({
            where: { id: { in: ids } },
            data: {
                status,
                ...(status === 'PAID' ? { paymentDate: new Date(), paidByUserId: session?.user?.id } : {})
            }
        });

        revalidatePath('/hr/payroll');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deletePayrollRecord(id: string) {
    try {
        await verifyActionPermission('PAYROLL_MANAGE');
        await prisma.payroll.delete({ where: { id } });
        revalidatePath('/hr/payroll');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteBatchPayroll(ids: string[]) {
    try {
        await verifyActionPermission('PAYROLL_MANAGE');
        await prisma.payroll.deleteMany({ where: { id: { in: ids } } });
        revalidatePath('/hr/payroll');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
