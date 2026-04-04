'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Số tiền phạt chuẩn mỗi lần đi muộn
const LATE_PENALTY_AMOUNT = 50000;
// Tổng công chuẩn mỗi tháng 
const STANDARD_WORK_DAYS = 26;

export async function generatePayroll(month: number, year: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Lấy tất cả nhân viên còn hoạt động
        const users = await prisma.user.findMany({
            where: { isActive: true },
            include: {
                employeeProfile: true,
                attendances: {
                    where: { date: { gte: startDate, lte: endDate } }
                }
            }
        });

        const payrollUpdates = [];

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

             const workDays = totalPresent + (totalHalfDay * 0.5);
             const latePenalties = totalLate * LATE_PENALTY_AMOUNT;
             let netSalary = (baseSalary / STANDARD_WORK_DAYS) * workDays - latePenalties;
             if (netSalary < 0) netSalary = 0;

             payrollUpdates.push({
                 userId: user.id,
                 month,
                 year,
                 baseSalary,
                 workDays,
                 latePenalties,
                 bonus: 0,
                 deductions: 0,
                 netSalary: Math.round(netSalary),
                 status: "DRAFT"
             });
        }

        // Cập nhật hoặc tạo mới hàng loạt
        for (const data of payrollUpdates) {
             await prisma.payroll.upsert({
                 where: { userId_month_year: { userId: data.userId, month, year } },
                 update: {
                     baseSalary: data.baseSalary,
                     workDays: data.workDays,
                     latePenalties: data.latePenalties,
                     netSalary: data.netSalary + 0 // existing bonus/deductions logic would go here if we wanted to preserve them on re-gen, but generation overwrites.
                     // ACTUALLY: we should preserve existing bonus/deductions
                 },
                 create: data
             });
             
             // Now recalibrate Net Salary preserving the user's manual bonus inputs if the record existed
             const existing = await prisma.payroll.findUnique({ where: { userId_month_year: { userId: data.userId, month, year } }});
             if (existing) {
                 const recalculatedNet = (existing.baseSalary / STANDARD_WORK_DAYS) * existing.workDays 
                                         - existing.latePenalties 
                                         + existing.bonus 
                                         - existing.deductions;
                 await prisma.payroll.update({
                     where: { id: existing.id },
                     data: { netSalary: Math.round(Math.max(0, recalculatedNet)) }
                 });
             }
        }

        revalidatePath('/hr/payroll');
        return { success: true };
    } catch (e: any) {
        console.error("Generate Payroll Error:", e);
        return { success: false, error: e.message };
    }
}

export async function updatePayrollRecord(id: string, data: { bonus: number, deductions: number, status?: string }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const existing = await prisma.payroll.findUnique({ where: { id } });
        if (!existing) throw new Error("Payroll record not found");

        const recalculatedNet = (existing.baseSalary / STANDARD_WORK_DAYS) * existing.workDays 
                                - existing.latePenalties 
                                + data.bonus 
                                - data.deductions;

        await prisma.payroll.update({
            where: { id },
            data: {
                bonus: data.bonus,
                deductions: data.deductions,
                netSalary: Math.round(Math.max(0, recalculatedNet)),
                ...(data.status ? { status: data.status } : {})
            }
        });

        revalidatePath('/hr/payroll');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
