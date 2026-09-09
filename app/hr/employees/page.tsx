import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import EmployeesClient from "./EmployeesClient";
import { Users } from "lucide-react";

export const metadata = { title: "Quản lý Hồ sơ Nhân sự" };

export default async function EmployeesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'HR'].includes(session.user.role)) return <div>Unauthorized</div>;

    const employees = await prisma.user.findMany({
        where: { isActive: true }, // or all if we want inactive too. For now get all.
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            employeeProfile: true,
            laborContracts: {
                where: { status: "ACTIVE" }
            }
        },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="space-y-6 w-full">
            <EmployeesClient initialData={employees} />
        </div>
    );
}
