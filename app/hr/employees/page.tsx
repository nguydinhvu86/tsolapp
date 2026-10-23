import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import EmployeesClient from "./EmployeesClient";

export const metadata = { title: "Quản lý Hồ sơ Nhân sự | TSOL ERP" };

export default async function EmployeesPage() {
    const session = await getServerSession(authOptions);
    const perms = (session?.user?.permissions as string[]) || [];
    const canView =
        session?.user &&
        (['ADMIN', 'HR', 'MANAGER'].includes(session.user.role) ||
            perms.some((p: string) => p.startsWith('EMPLOYEES_')));

    if (!canView) {
        return (
            <div className="p-8 text-center text-xs font-semibold text-slate-500">
                Bạn không có quyền truy cập trang Quản lý Hồ sơ Nhân sự.
            </div>
        );
    }

    const employees = await prisma.user.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            extension: true,
            createdAt: true,
            permissionGroup: {
                select: {
                    name: true
                }
            },
            employeeProfile: true,
            laborContracts: {
                where: { status: "ACTIVE" }
            }
        },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="space-y-4 w-full">
            <EmployeesClient initialData={employees} />
        </div>
    );
}
