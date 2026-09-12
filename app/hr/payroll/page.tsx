import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import PayrollClient from "./PayrollClient";
import { Calculator } from "lucide-react";

export const metadata = { title: "Quản lý Lương (Payroll)" };

export default async function PayrollPage({
    searchParams,
}: {
    searchParams: { month?: string, year?: string }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'HR'].includes(session.user.role)) return <div>Unauthorized</div>;

    const now = new Date();
    const month = searchParams.month ? parseInt(searchParams.month) : now.getMonth() + 1;
    const year = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();

    const payrolls = await prisma.payroll.findMany({
        where: { month, year },
        include: {
            user: {
                select: { 
                    id: true,
                    name: true, 
                    email: true, 
                    role: true,
                    employeeProfile: {
                        select: {
                            id: true,
                            department: true,
                            position: true,
                            bankAccount: true,
                            bankName: true,
                            taxCode: true,
                            identityNumber: true,
                            phoneNumber: true,
                            baseSalary: true,
                            hourlyRate: true,
                            startDate: true,
                        }
                    } 
                }
            }
        },
        orderBy: [
            { user: { employeeProfile: { department: 'asc' } } },
            { user: { name: 'asc' } }
        ]
    });

    // Lấy danh sách các phòng ban hiện có
    const allDepartments = await prisma.employeeProfile.findMany({
        where: { department: { not: null } },
        select: { department: true },
        distinct: ['department']
    });
    const departments = allDepartments.map(d => d.department).filter(Boolean) as string[];

    return (
        <div className="space-y-6 w-full">
            <PayrollClient 
                initialData={payrolls} 
                currentMonth={month} 
                currentYear={year} 
                departments={departments}
            />
        </div>
    );
}
